# Git Explorer

Git Explorer can convert any Github-compatible URL into a file explorer that can be embedded into a web page.

For example, the link:

[https://github.com/michaelliao/git-explorer/tree/main/sample](https://github.com/michaelliao/git-explorer/tree/main/sample)

can be converted to:

![gitexplorer.png](gitexplorer.png)

See live demo on [https://michaelliao.github.io/git-explorer/](https://michaelliao.github.io/git-explorer/).

# Usage

```
<html>
<head>
    <link rel="stylesheet" href="https://michaelliao.github.io/git-explorer/css/git-explorer.css">
    <script src="https://michaelliao.github.io/git-explorer/js/git-explorer.js"></script>
</head>
<body>
    <div id="placeholder"></div>
    <script>
        createGitExplorer(
            document.querySelector('#placeholder'), // DOM to replace
            'https://github.com/michaelliao/git-explorer/tree/main/sample' // GitHub-compatible URL
        );
    </script>
</body>
</html>
```

### How to change style

Override [git-explorer.css](https://github.com/michaelliao/git-explorer/blob/main/css/git-explorer.css) in your own CSS.

# Notes

The URL must contain branch info so the following URL is not work:

```
https://github.com/michaelliao/git-explorer
```

Use URL with branch instead:

```
https://github.com/michaelliao/git-explorer/tree/main
```
