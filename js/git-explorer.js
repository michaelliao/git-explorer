(function () {
    const CONFIG = {
        github: {
            name: 'GitHub',
            link: 'https://github.com',
            pattern: 'https://github.com/${owner}/${repo}/tree/${branch}${path}',
            treeApi: 'https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1',
            contentApi: 'https://api.github.com/repos/${owner}/${repo}/contents${path}?ref=${branch}',
            blobApi: 'https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}',
            downloadUrl: 'https://github.com/${owner}/${repo}/raw/${branch}${path}'
        },
        gitee: {
            name: 'Gitee',
            link: 'https://gitee.com',
            pattern: 'https://gitee.com/${owner}/${repo}/tree/${branch}${path}',
            treeApi: 'https://gitee.com/api/v5/repos/${owner}/${repo}/git/trees/${sha}?recursive=1',
            contentApi: 'https://gitee.com/api/v5/repos/${owner}/${repo}/contents${path}?ref=${branch}',
            blobApi: 'https://gitee.com/api/v5/repos/${owner}/${repo}/git/blobs/${sha}',
            downloadUrl: 'https://gitee.com/${owner}/${repo}/raw/${branch}${path}'
        }
    };

    const MAX_SIZE = 2097152; // 2MB

    const TEXT_FILES = [
        'asm', 'asp', 'aspx',
        'bat',
        'c', 'cc', 'cpp', 'clj', 'cs', 'csv',
        'dart',
        'el', 'erl', 'ex',
        'f', 'fs',
        'gitignore', 'go',
        'h', 'hh', 'htm', 'html',
        'ini',
        'java', 'js', 'jsx', 'json', 'jsp',
        'kt',
        'lisp',
        'm', 'm3u', 'm3u8', 'md', 'md5', 'mm',
        'p', 'pas', 'php', 'pl', 'pom', 'properties', 'py',
        'r', 'rb', 'rkt', 'rs', 'rss',
        's', 'sass', 'scala', 'scss', 'sh', 'sha1', 'shtm', 'shtml', 'sig', 'sm', 'sql', 'svg', 'swift',
        'toml', 'txt', 'ts',
        'v', 'vb', 'vbs',
        'xhtml', 'xml', 'xsd',
        'yml', 'yaml'];

    // image file extension -> mime type:
    let IMAGE_FILES = {
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.jpeg': 'image/jpeg',
        '.jpg': 'image/jpeg',
        '.jpe': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp'
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

    let gitExplorerDomId = 0;

    function nextDomId() {
        gitExplorerDomId++;
        return 'gitExplorer_' + gitExplorerDomId;
    }

    async function fetchJson(url, owner, repo, branch, sha, path, forceCache) {
        let actualUrl = url.replace('${owner}', owner).replace('${repo}', repo).replace('${branch}', branch).replace('${sha}', sha).replace('${path}', path);
        console.log(`fetch: ${actualUrl}`);
        let param = {};
        if (forceCache) {
            param.cache = 'force-cache';
        }
        let resp = await fetch(actualUrl, param);
        let json = await resp.json();
        return json;
    }

    function b64DecodeUnicode(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    window.__loadGitBlob = function (codeId, aId, url, path) {
        let
            aDom = document.querySelector('#' + aId),
            codeDom = document.querySelector('#' + codeId),
            current = codeDom.getAttribute('data'),
            size = parseFloat(aDom.getAttribute('size')),
            download = aDom.getAttribute('download'),
            filename = aDom.lastElementChild.innerText;
        console.log(`load blob ${filename}: ${url}, ${path}`);
        if (current === aId) {
            // ignore
            return;
        }
        // remove last selected <a>:
        if (current) {
            document.querySelector('#' + current).className = '';
        }
        codeDom.setAttribute('data', aId);
        codeDom.setAttribute('data-filename', filename);
        codeDom.setAttribute('data-status', 'progress');
        codeDom.setAttribute('data-download', download);
        codeDom.setAttribute('data-istext', 0);
        aDom.className = 'git-explorer-tree-item-selected';
        if (size > MAX_SIZE) {
            codeDom.innerHTML = `<i>Cannot display large file.</i> <a target="_blank" href="${download}">Download</a>`
            return;
        }
        codeDom.innerHTML = '<i>Loading...</i>';
        // start load blob:
        fetchJson(url, '', '', '', '', path, true).then((obj) => {
            // check if url changed:
            let exp = document.querySelector('#' + codeId);
            if (exp.getAttribute('data') === aId) {
                let filename = splitPath(path)[1];
                let fileext = splitFilename(filename)[1];
                let imgMime = IMAGE_FILES[fileext];
                if (imgMime) {
                    // this is an image:
                    codeDom.innerHTML = `<img src='data:${imgMime};base64,${obj.content}' />`;
                } else {
                    // try as text:
                    try {
                        codeDom.innerText = b64DecodeUnicode(obj.content);
                        codeDom.setAttribute('data-istext', 1);
                    } catch (err) {
                        // binary content:
                        codeDom.innerHTML = `<i>Cannot display binary file.</i> <a target="_blank" href="${download}">Download</a>`
                    }
                }
            } else {
                console.warn(`ignore result because selection changed: ${url}`);
            }
            codeDom.setAttribute('data-status', 'completed');
        }).catch((err) => {
            console.log(JSON.stringify(err))
            console.error('load content failed.', err);
            codeDom.setAttribute('data-status', 'completed');
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

    function getPreDom(dom) {
        let targetDom = $(dom.parentElement).parent().find('pre > code');
        if (targetDom.length == 0) {
            return null;
        }
        if (targetDom.data('status') != 'completed') {
            return null;
        }
        return targetDom[0];
    }
    function getPreCodeContent(dom) {
        let targetDom = getPreDom(dom);
        if (!targetDom) {
            return '';
        }
        return targetDom.innerText;
    }
    function getPreCodeFileName(dom) {
        let targetDom = getPreDom(dom);
        if (!targetDom) {
            return '';
        }
        return targetDom.dataset.filename;
    }


    window.__copyContent = function(dom) {
        let preCodeContent = getPreCodeContent(dom);
        let fileName = getPreCodeFileName(dom);
        if ($.trim(fileName).length == 0) {
            return;
        }
        if ($.trim(preCodeContent).length == 0) {
            return;
        }

        let type = "text/plain";
        let blob = new Blob([preCodeContent], { type });
        let data = [new ClipboardItem({ [type]: blob })];
        navigator.clipboard.write(data).then(
          () => {
            /* success */
          },
          () => {
            /* failure */
          },
        );
    }

    window.__downloadFile = function(dom) {
        let targetDom = getPreDom(dom);
        let fileName = getPreCodeFileName(dom);
        let preCodeContent = getPreCodeContent(dom);
        // 创建下载链接
        let a = document.createElement('a');
        if (targetDom.dataset.istext == 1) {
            let type = "text/plain";
            let blob = new Blob([preCodeContent], { type });
            // 创建URL
            let url = URL.createObjectURL(blob);
            a.href = url;
        } else {
            download = targetDom[0].dataset.download;
            a.setAttribute('target', '_blank');
            a.href = download;
        }
        a.download = fileName;
        a.style.width = '0px'; // 设置宽度
        a.style.height = '0px'; // 设置高度
        a.style.visibility = 'hidden'; // 设置为不可见
        // 触发下载
        document.body.appendChild(a);
        a.click();
        // 移除下载链接
        setTimeout(function(){ document.body.removeChild(a); }, 500);
    }

    /**
     * '/abc/xyz/hello' -> ['/abc/xyz', 'hello']
     * '/abc/xyz' -> ['/abc', 'xyz']
     * '/abc' -> ['', 'abc']
     */
    function splitPath(path) {
        let n = path.lastIndexOf('/');
        return [path.substring(0, n), path.substring(n + 1)];
    }

    /**
     * 'hello.jpg' -> ['hello', '.jpg']
     * '.gitignore' -> ['', '.gitignore']
     * 'README' -> ['README', '']
     */
    function splitFilename(name) {
        let n = name.lastIndexOf('.');
        if (n >= 0) {
            return [name.substring(0, n), name.substring(n)];
        }
        return [name, ''];
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

    function createTreeItem(blobApiUrl, downloadUrl, domId, item, depth) {
        let style = depth > 0 ? 'style="display:none"' : '';
        if (item.type === 'blob') {
            let aId = nextDomId();
            let apiUrl = blobApiUrl.replace('${sha}', item.sha);
            let download = downloadUrl.replace('${path}', item.path);
            return `
<div class="git-explorer-tree-item" ${style}>
    <a id="${aId}" size="${item.size}" path="${item.path}" download="${download}" href="javascript:void(0)" onclick="__loadGitBlob('${domId}', '${aId}', '${apiUrl}', '${item.path}')">▤ <span>${item.name}</span></a>
</div>
`;
        } else if (item.type === 'tree') {
            let cs = [];
            if (item.children) {
                for (let cItem of item.children) {
                    cs.push(createTreeItem(blobApiUrl, downloadUrl, domId, cItem, depth + 1));
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

    function createTreeItems(blobApiUrl, downloadUrl, domId, items) {
        let cs = [];
        for (let item of items) {
            cs.push(createTreeItem(blobApiUrl, downloadUrl, domId, item, 0));
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
            blobApiUrl = config.blobApi.replace('${owner}', owner).replace('${repo}', repo).replace('${branch}', branch),
            downloadUrl = config.downloadUrl.replace('${owner}', owner).replace('${repo}', repo).replace('${branch}', branch).replace('${path}', path + '/${path}');
        let treeItems = createTreeItems(blobApiUrl, downloadUrl, codeId, items);
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
                <div class="git-explorer-tree-tool">
                    <i class="bi-arrows-collapse" alt="collapse folders" id="btu-collapse-folders"></i>
                    <i class="bi-download" alt="download folders" id="btu-download-folders"></i>
                </div>
                ${treeItems}
            </div>
        </div>
        <div class="git-explorer-frame-resize">
        </div>
        <div class="git-explorer-frame-code">
            <div class="git-explorer-frame-code-tool">
                <i class="bi-copy" alt="copy" data-btu="btu-copy-content" onclick="__copyContent(this)"></i>
                <i class="bi-file-earmark-arrow-down" alt="download file" data-btu="btu-download-file" onclick="__downloadFile(this)"></i>
            </div>
            <pre><code id="${codeId}" owner="${owner}" repo="${repo}" branch="${branch}"></code></pre>
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
