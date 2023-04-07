(function () {
    let CONFIG = {
        github: {
            name: 'GitHub',
            link: 'https://github.com',
            pattern: 'https://github.com/${owner}/${repo}/tree/${branch}${path}',
            treeApi: 'https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1',
            contentApi: 'https://api.github.com/repos/${owner}/${repo}/contents${path}?ref=${branch}',
            blobApi: 'https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}'
        },
        gitee: {
            name: 'Gitee',
            link: 'https://gitee.com',
            pattern: 'https://gitee.com/${owner}/${repo}/tree/${branch}${path}',
            treeApi: 'https://gitee.com/api/v5/repos/${owner}/${repo}/git/trees/${sha}?recursive=1',
            contentApi: 'https://gitee.com/api/v5/repos/${owner}/${repo}/contents${path}?ref=${branch}',
            blobApi: 'https://gitee.com/api/v5/repos/${owner}/${repo}/git/blobs/${sha}'
        }
    };

    // file name -> highlight js language name:
    let FILENAMES = {
        '*.sh': 'Bash',
        '*.clj': 'Clojure',
        '*.h': 'Cpp',
        '*.c': 'Cpp',
        '*.cpp': 'Cpp',
        '*.cs': 'CSharp',
        '*.css': 'CSS',
        '*.go': 'Go',
        '*.htm': 'HTML',
        '*.html': 'HTML',
        '*.ini': 'INI',
        '*.java': 'Java',
        '*.js': 'JavaScript',
        '*.json': 'JSON',
        '*.py': 'Python',
        '*.rb': 'Ruby',
        '*.sql': 'SQL',
        '*.swift': 'Swift',
        '*.ts': 'TypeScript',
        '*.xml': 'XML',
        'Makefile': 'Makefile'
    }

    window.__gitExplorerDomId = 0;

    function nextDomId() {
        window.__gitExplorerDomId++;
        return 'gitExplorer_' + window.__gitExplorerDomId;
    }

    async function fetchJson(url, owner, repo, branch, sha, path) {
        let actualUrl = url.replace('${owner}', owner).replace('${repo}', repo).replace('${branch}', branch).replace('${sha}', sha).replace('${path}', path);
        console.log(`fetch: ${actualUrl}`);
        let resp = await fetch(actualUrl, { cache: "force-cache" });
        let json = await resp.json();
        return json;
    }

    function b64DecodeUnicode(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    window.__loadGitBlob = function (codeId, aId, url) {
        let
            aDom = document.querySelector('#' + aId),
            codeDom = document.querySelector('#' + codeId),
            current = codeDom.getAttribute('data'),
            filename = aDom.lastElementChild.innerText;
        console.log(`load blob ${filename}: ${url}`);
        if (current === aId) {
            // ignore
            return;
        }
        // remove last selected <a>:
        if (current) {
            document.querySelector('#' + current).className = '';
        }
        codeDom.setAttribute('data', aId);
        aDom.className = 'git-explorer-tree-item-selected';
        codeDom.innerHTML = '<i>Loading...</i>';
        // start load blob:
        fetchJson(url, '', '', '', '', '').then((obj) => {
            // check if url changed:
            let exp = document.querySelector('#' + codeId);
            if (exp.getAttribute('data') === aId) {
                codeDom.innerText = b64DecodeUnicode(obj.content);
            } else {
                console.warn(`ignore result because selection changed: ${url}`);
            }
        }).catch((err) => {

        });
    };

    window.__toggleGitTree = function (a) {
        console.log(a, a.parentNode);
        let stat = a.getAttribute('data');
        if (stat === '0') {
            // show:
            a.firstElementChild.innerText = '▾';
            for (const child of a.parentNode.children) {
                if (child.tagName === 'DIV') {
                    child.style.display = '';
                }
            }
        } else {
            // hide:
            a.firstElementChild.innerText = '▸';
            for (const child of a.parentNode.children) {
                if (child.tagName === 'DIV') {
                    child.style.display = 'none';
                }
            }
        }
        a.setAttribute('data', stat === '0' ? '1' : '0');
    };

    /**
     * '/abc/xyz/hello' -> ['/abc/xyz', 'hello']
     * '/abc/xyz' -> ['/abc', 'xyz']
     * '/abc' -> ['', 'abc']
     */
    function splitPath(path) {
        let n = path.lastIndexOf('/');
        return [path.substring(0, n), path.substring(n + 1)];
    }

    function addTree(top, item) {
        if (item.path.indexOf('/', top.path.length + 1) < 0) {
            if (!top.children) {
                top.children = [];
            }
            top.children.push(item);
        } else {
            for (let child of top.children) {
                if (item.path.startsWith(child.path + '/')) {
                    addTree(child, item);
                }
            }
        }
    }

    function mergeTree(top) {
        if (top.type === 'tree' && top.children) {
            if (top.children.length === 1) {
                // single child:
                let child = top.children[0];
                if (child.type === 'tree') {
                    top.name = top.name + '/' + child.name;
                    top.path = child.path;
                    top.mode = child.mode;
                    top.sha = child.sha;
                    top.url = child.url;
                    top.children = child.children;
                    // continue merge:
                    mergeTree(top);
                }
            } else {
                for (let child of top.children) {
                    mergeTree(child);
                }
            }
        }
    }

    async function doCreateGitExplorer(url, config, owner, repo, branch, path) {
        console.log(`init git explorer: owner=${owner}, repo=${repo}, branch=${branch}, path=${path}.`)
        let treeList = null;
        if (path === '/') {
            let result = await fetchJson(config.treeApi, owner, repo, branch, branch, path);
            if (!result.tree) {
                console.error('bad response:', JSON.stringify(result));
                throw 'Bad response';
            }
            treeList = result.tree;
        } else {
            // find sha:
            let [parentPath, current] = splitPath(path);
            let result1 = await fetchJson(config.contentApi, owner, repo, branch, null, parentPath);
            if (!Array.isArray(result1)) {
                console.error('bad response:', JSON.stringify(result1));
                throw 'Bad response';
            }
            let item = result1.find(obj => obj.type === 'dir' && obj.name === current);
            if (!item) {
                throw 'Path not found';
            }
            let sha = item.sha;
            let result2 = await fetchJson(config.treeApi, owner, repo, branch, sha, null);
            if (!result2.tree) {
                console.error('bad response:', JSON.stringify(result2));
                throw 'Bad response';
            }
            treeList = result2.tree;
        }
        // build tree:
        let root = {
            name: '',
            path: '',
            children: []
        };
        treeList.sort((o1, o2) => {
            if (o1.type !== o2.type) {
                return o1.type === 'tree' ? -1 : 1;
            }
            return o1.path.toLowerCase() < o2.path.toLowerCase() ? -1 : 1;
        });
        for (let item of treeList) {
            // set name:
            item.name = splitPath(item.path)[1];
            addTree(root, item);
        }
        for (let item of root.children) {
            mergeTree(item);
        }
        return {
            config: config,
            owner: owner,
            repo: repo,
            branch: branch,
            path: path,
            url: url,
            items: root.children
        }
    }

    function createTreeItem(blobApiUrl, domId, item, depth) {
        let style = depth > 0 ? 'style="display:none"' : '';
        if (item.type === 'blob') {
            let aId = nextDomId();
            let url = blobApiUrl.replace('${sha}', item.sha);
            return `
<div class="git-explorer-tree-item" ${style}>
    <a id="${aId}" href="javascript:void(0)" onclick="__loadGitBlob('${domId}', '${aId}', '${url}')">▤ <span>${item.name}</span></a>
</div>
`;
        } else if (item.type === 'tree') {
            let cs = [];
            if (item.children) {
                for (let cItem of item.children) {
                    cs.push(createTreeItem(blobApiUrl, domId, cItem, depth + 1));
                }
            }
            if (cs.length === 0) {
                cs.push('<div></div>');
            }
            let children = cs.join('\n');
            return `
<div class="git-explorer-tree-item" ${style}>
    <a href="javascript:void(0)" onclick="__toggleGitTree(this)" data="0"><span>▸</span> ${item.name}</a>
    ${children}
</div>
`;
        } else {
            return '';
        }
    }

    function createTreeItems(blobApiUrl, domId, items) {
        let cs = [];
        for (let item of items) {
            cs.push(createTreeItem(blobApiUrl, domId, item, 0));
        }
        return cs.join('\n');
    }

    function createHtml(domToReplace, data) {
        // init template:
        let
            config = data.config,
            owner = data.owner,
            repo = data.repo,
            branch = data.branch,
            path = data.path,
            items = data.items,
            domId = nextDomId(),
            codeId = nextDomId(),
            blobApiUrl = config.blobApi.replace('${owner}', owner).replace('${repo}', repo).replace('${branch}', branch);
        let treeItems = createTreeItems(blobApiUrl, codeId, items);
        let
            domHtml = `
<div id="${domId}" class="git-explorer">
    <div class="git-explorer-header">
        <a href="${config.link}" target="_blank">${config.name}</a>
        ▸
        <a href="${config.link}/${owner}" target="_blank">${owner}</a>
        ▸
        <a href="${config.link}/${owner}/${repo}" target="_blank">${repo}</a>
        ▸
        <a href="${data.url}" target="_blank">${path}</a>
    </div>
    <div class="git-explorer-frame">
        <div class="git-explorer-frame-tree">
            <div class="git-explorer-tree">
                ${treeItems}
            </div>
        </div>
        <div class="git-explorer-frame-resize">
        </div>
        <div class="git-explorer-frame-code">
            <pre><code id="${codeId}"></code></pre>
        </div>
    </div>
</div>
`;
        let dom = document.createElement('div');
        dom.innerHTML = domHtml;
        domToReplace.parentNode.replaceChild(dom, domToReplace);

        // set header:
        // add root.children[] to tree:
    }


    window.createGitExplorer = function (domToReplace, url) {
        console.log(`create git explorer by url: ${url}`);
        for (let gitx in CONFIG) {
            let reStr = '^' + CONFIG[gitx].pattern.replace('${owner}', '(?<owner>[^/]+)')
                .replace('${repo}', '(?<repo>[^/]+)')
                .replace('${branch}', '(?<branch>[^/]+)')
                .replace('${path}', '(?<path>.*)') + '$';
            let reg = new RegExp(reStr);
            let m = reg.exec(url);
            if (m) {
                doCreateGitExplorer(url, CONFIG[gitx], m[1], m[2], m[3], m[4] || '/').then((data) => {
                    console.log(`load data ok: ${url}`);
                    try {
                        createHtml(domToReplace, data);
                    } catch (err) {
                        console.error('create html failed.', err);
                    }
                }).catch((e) => {
                    console.error(`load data failed: ${url}`, e);
                });
                return;
            }
        }
        console.error(`could not parse url: ${url}`);
    };
})();
