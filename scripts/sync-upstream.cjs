const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const UPSTREAM_URL = process.env.LEZER_LATEX_UPSTREAM_URL || 'https://github.com/overleaf/overleaf.git'
const UPSTREAM_DIR =
    process.env.LEZER_LATEX_UPSTREAM_DIR ||
    'services/web/frontend/js/features/source-editor/lezer-latex'
const UPSTREAM_REF = process.env.LEZER_LATEX_UPSTREAM_REF || 'main'
const FILES = ['latex.grammar', 'tokens.mjs', 'README.md']
const BRANCH = 'local'

const rootDir = path.join(__dirname, '..')
const grammarDir = path.join(rootDir, 'grammar')
const cloneDir = path.join(rootDir, 'external', 'overleaf')
const statePath = path.join(rootDir, 'external', '.sync-state.json')
const lenient = process.argv.includes('--lenient')

function git(args, opts = {}) {
    return execFileSync('git', args, { cwd: cloneDir, encoding: 'utf8', ...opts })
}

function copyFiles(fromDir, toDir) {
    for (const name of FILES) {
        fs.copyFileSync(path.join(fromDir, name), path.join(toDir, name))
    }
}

function ensureClone() {
    if (fs.existsSync(path.join(cloneDir, '.git'))) return
    fs.mkdirSync(path.dirname(cloneDir), { recursive: true })
    execFileSync(
        'git',
        ['clone', '--filter=blob:none', '--sparse', UPSTREAM_URL, cloneDir],
        { cwd: rootDir, stdio: 'inherit' }
    )
    git(['sparse-checkout', 'set', UPSTREAM_DIR])
    git(['config', 'user.name', 'codemirror-lang-latex sync'])
    git(['config', 'user.email', 'sync@codemirror-lang-latex.invalid'])
    git(['config', 'gc.auto', '0'])
    const base = findBaseCommit()
    console.log(`sync-upstream: initializing local branch at fork point ${base.slice(0, 12)}`)
    git(['checkout', '-q', '-B', BRANCH, base])
    importLocalChanges('Local codemirror-lang-latex modifications', true)
}

// Finds the upstream commit the local files were originally copied from: the
// commit touching UPSTREAM_DIR whose file contents are closest to grammar/.
// Override with LEZER_LATEX_BASE_REF when the guess is wrong.
function findBaseCommit() {
    if (process.env.LEZER_LATEX_BASE_REF) {
        return git(['rev-parse', process.env.LEZER_LATEX_BASE_REF]).trim()
    }
    const tip = git(['rev-parse', UPSTREAM_REF === 'main' ? 'origin/main' : UPSTREAM_REF]).trim()
    const commits = git(['rev-list', tip, '--', UPSTREAM_DIR]).trim().split('\n').filter(Boolean)
    let best = tip
    let bestScore = Infinity
    for (const commit of commits) {
        let score = 0
        for (const name of FILES) {
            let blob
            try {
                blob = git(['cat-file', 'blob', `${commit}:${UPSTREAM_DIR}/${name}`])
            } catch {
                score = Infinity
                break
            }
            score += countChangedLines(fs.readFileSync(path.join(grammarDir, name), 'utf8'), blob)
        }
        if (score === 0) return commit
        if (score < bestScore) {
            bestScore = score
            best = commit
        }
    }
    return best
}

// Returns the number of added plus removed lines between two texts, via git diff.
function countChangedLines(a, b) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lezer-latex-diff-'))
    try {
        fs.writeFileSync(path.join(tmp, 'a'), a)
        fs.writeFileSync(path.join(tmp, 'b'), b)
        let out
        try {
            out = git(['diff', '--no-index', '--numstat', path.join(tmp, 'a'), path.join(tmp, 'b')])
        } catch (err) {
            out = err.stdout || ''
        }
        const m = String(out).match(/^(\d+)\s+(\d+)/)
        return m ? Number(m[1]) + Number(m[2]) : 0
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true })
    }
}

// Copies into the clone only the files the developer actually changed in
// grammar/ since the last sync, so a stale grammar/ can never overwrite work
// (e.g. a conflict resolution) already committed in the clone.
function importLocalChanges(message, force = false) {
    const state = loadState()
    if (!force && Object.keys(state).length === 0) return
    for (const name of FILES) {
        if (!force && state[name] === hashFile(path.join(grammarDir, name))) continue
        fs.copyFileSync(path.join(grammarDir, name), path.join(cloneDir, UPSTREAM_DIR, name))
    }
    if (git(['status', '--porcelain']).trim() !== '') {
        git(['add', '-A'])
        git(['commit', '-q', '-m', message])
    }
    saveState()
}

// Records the content hash of each grammar/ file at the moment it was last
// synced in either direction, distinguishing developer edits from staleness.
function loadState() {
    try {
        return JSON.parse(fs.readFileSync(statePath, 'utf8'))
    } catch {
        return {}
    }
}

function saveState() {
    const state = {}
    for (const name of FILES) {
        state[name] = hashFile(path.join(grammarDir, name))
    }
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n')
}

function hashFile(filePath) {
    return git(['hash-object', filePath]).trim()
}

function main() {
    ensureClone()

    if (fs.existsSync(path.join(cloneDir, '.git', 'MERGE_HEAD'))) {
        throw new Error(
            `an unfinished merge exists in ${path.relative(rootDir, cloneDir)}; ` +
            `resolve it with git (git status, edit, git add, git merge --continue ` +
            `or git merge --abort), then rerun`
        )
    }

    git(['checkout', '-q', BRANCH])
    importLocalChanges('Local modifications from grammar/')
    git(['fetch', '-q', 'origin', UPSTREAM_REF])

    try {
        git(['merge', '--quiet', '--no-edit', 'FETCH_HEAD'])
    } catch (err) {
        console.error(
            `sync-upstream: merge conflict with upstream. Resolve it with git in ` +
            `${path.relative(rootDir, cloneDir)} (git status, edit conflicts, git add, ` +
            `git merge --continue), then rerun this script to export the result.`
        )
        if (!lenient) process.exitCode = 1
        return
    }

    let exported = 0
    for (const name of FILES) {
        const merged = path.join(cloneDir, UPSTREAM_DIR, name)
        if (hashFile(merged) !== hashFile(path.join(grammarDir, name))) {
            fs.copyFileSync(merged, path.join(grammarDir, name))
            exported++
        }
    }
    saveState()
    if (exported > 0) {
        console.log(`sync-upstream: ${exported} file(s) in grammar/ updated from ${UPSTREAM_URL}@${UPSTREAM_REF}`)
    } else {
        console.log('sync-upstream: already up to date with upstream, grammar/ unchanged')
    }
}

try {
    main()
} catch (err) {
    if (lenient) {
        console.warn(`sync-upstream: skipped (${err.message.split('\n')[0]})`)
    } else {
        console.error(`sync-upstream: ${err.message}`)
        process.exitCode = 1
    }
}