# HTMLApp

Static IIS-friendly demo site.

## Structure

```text
HTMLApp/
├── index.html
├── pages.json
├── assets/
│   ├── styles.css
│   └── app.js
├── tools/
│   ├── salary-filter.html
│   └── job-opening-builder.html
├── guides/
│   └── github-beginners-guide.html
└── data/
    └── sample-data.csv
```

Add a new page by creating its HTML file, then add its `title`, `url`,
`description`, and `category` to `pages.json`. The home page reads that file
and creates the navigation cards automatically.

For local development, serve the folder through IIS or another web server.
The dashboard uses `pages.json`, so it may not load correctly when opened
directly with a `file:///` URL in some browsers.

## Deployment documentation

For beginner-friendly instructions to create an Azure Windows VM, install IIS,
copy this project, create the `HTMLApp` virtual directory, configure HTTP
access, and test the site, see:

- [Azure Windows VM and IIS deployment guide](docs/azure-windows-iis-deployment.md)