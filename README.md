# Git Explorer

Git Explorer can convert any Github-compatible URL into a file explorer that can be embedded into a web page.

For example, the link:

[https://github.com/michaelliao/git-explorer/tree/master/sample](https://github.com/michaelliao/git-explorer/tree/master/sample)

can be converted to:

![gitexplorer.png](gitexplorer.png)

See live demo on [https://gitexplorer.itranswarp.com](https://gitexplorer.itranswarp.com).

# Usage

```
<html>
<head>
    <link rel="stylesheet" href="https://gitexplorer.itranswarp.com/css/git-explorer.css">
    <script src="https://gitexplorer.itranswarp.com/js/git-explorer.js"></script>
</head>
<body>
    <div id="placeholder"></div>
    <script>
        createGitExplorer(
            document.querySelector('#placeholder'), // DOM to replace
            'https://github.com/michaelliao/git-explorer/tree/master/sample' // GitHub-compatible URL
        );
    </script>
</body>
</html>
```

# Notes

The URL must contain branch info so the following URL not works:

```
https://github.com/michaelliao/git-explorer
```

Use URL with branch instead:

```
https://github.com/michaelliao/git-explorer/tree/master
```