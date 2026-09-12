# Azure Windows VM and IIS deployment guide

This guide publishes the static HTMLApp site on a Windows Server virtual
machine in Azure. It uses IIS and an IIS virtual directory; no backend,
database, Node.js, or Python is required.

The final application URL will be:

```text
http://YOUR_VM_PUBLIC_IP/HTMLApp/
```

The IIS mapping will be:

```text
/HTMLApp -> C:\HTMLApp
```

## 1. Check the project files

Before creating the VM, make sure the project has this structure:

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

## 2. Create an Azure resource group

1. Open [Azure Portal](https://portal.azure.com) and sign in.
2. Search for **Resource groups**.
3. Select **Create**.
4. Select your subscription.
5. Create a resource group named `HTMLApp-Test-RG`.
6. Choose a region near you.
7. Select **Review + create**, then **Create**.

The resource group keeps the VM and its related resources together.

## 3. Create the Windows VM

1. Search for **Virtual machines**.
2. Select **Create** > **Azure virtual machine**.
3. On **Basics**, select:
   - Resource group: `HTMLApp-Test-RG`
   - VM name: `htmlapp-vm`
   - Image: **Windows Server 2022 Datacenter: Azure Edition - x64 Gen2**
   - Size: a small development size such as `Standard_B2s`
   - Authentication: **Password**
   - Administrator username: for example `htmladmin`
4. Create a strong administrator password and store it securely.
5. Allow inbound **RDP (3389)** and **HTTP (80)**.
6. On **Management**, enable auto-shutdown to limit test costs.
7. Select **Review + create**, then **Create**.

Azure VM sizes and availability vary by region and subscription.

## 4. Connect to the VM

1. Open the new VM in Azure Portal.
2. On **Overview**, copy the **Public IP address**.
3. Select **Connect** > **RDP** > **Download RDP file**.
4. Open the downloaded file.
5. Sign in with the administrator username and password.

When reconnecting later, use **Show Options** > **Local Resources** > **More**
to share the local drive containing this project. This makes copying the files
to the VM easier.

## 5. Install and start IIS

Open **PowerShell as Administrator** inside the VM and run:

```powershell
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Start-Service -Name W3SVC
Get-Service -Name W3SVC
```

The final command should show the `W3SVC` service as `Running`.

Use `Start-Service`, not `Start-Process`, for Windows services:

```powershell
# Correct
Start-Service -Name W3SVC

# Incorrect
# Start-Process -Service W3SVC
```

Open `http://localhost` in the VM browser. The default IIS welcome page
confirms that IIS is installed.

## 6. Create the application folders

Use `C:\HTMLApp` as the application folder:

```powershell
New-Item -ItemType Directory -Force -Path "C:\HTMLApp"
New-Item -ItemType Directory -Force -Path "C:\HTMLApp\assets"
New-Item -ItemType Directory -Force -Path "C:\HTMLApp\tools"
New-Item -ItemType Directory -Force -Path "C:\HTMLApp\guides"
New-Item -ItemType Directory -Force -Path "C:\HTMLApp\data"
```

Copy the repository contents into `C:\HTMLApp`. The final VM structure should
contain:

```text
C:\HTMLApp\
├── index.html
├── pages.json
├── assets\
├── tools\
├── guides\
└── data\
```

The easiest beginner method is to share your local drive through Remote
Desktop, then copy `index.html`, `pages.json`, `assets`, `tools`, `guides`,
and `data` into `C:\HTMLApp`.

Verify the files with:

```powershell
Get-ChildItem -Recurse "C:\HTMLApp"
```

## 7. Create the IIS virtual directory

The virtual directory makes `/HTMLApp` point to `C:\HTMLApp`.

### Using IIS Manager

1. Open **Internet Information Services (IIS) Manager**.
2. Expand the VM name, then **Sites**.
3. Right-click **Default Web Site**.
4. Select **Add Virtual Directory**.
5. Enter:
   - Alias: `HTMLApp`
   - Physical path: `C:\HTMLApp`
6. Select **OK**.

### Or using PowerShell

Run PowerShell as Administrator:

```powershell
Import-Module WebAdministration

New-WebVirtualDirectory `
  -Site "Default Web Site" `
  -Name "HTMLApp" `
  -PhysicalPath "C:\HTMLApp"

Get-WebVirtualDirectory -Site "Default Web Site"
```

The output should include `/HTMLApp` mapped to `C:\HTMLApp`.

## 8. Test inside the VM

Open these URLs in the VM browser:

```text
http://localhost/HTMLApp/
http://localhost/HTMLApp/tools/salary-filter.html
http://localhost/HTMLApp/tools/job-opening-builder.html
http://localhost/HTMLApp/guides/github-beginners-guide.html
```

The dashboard should show the three configured pages. On the salary filter
page, select:

```text
C:\HTMLApp\data\sample-data.csv
```

The rows with salary greater than `1000` should be returned. A salary equal
to `1000` is intentionally excluded.

## 9. Allow HTTP access

### Windows Firewall

Run PowerShell as Administrator:

```powershell
New-NetFirewallRule `
  -DisplayName "Allow HTMLApp HTTP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 80 `
  -Action Allow
```

### Azure network security group

In Azure Portal:

1. Open the VM.
2. Select **Networking**.
3. Open **Inbound port rules**.
4. Select **Add inbound port rule**.
5. Add:
   - Source: `Any` for a temporary demo
   - Service: `HTTP`
   - Destination port: `80`
   - Protocol: `TCP`
   - Action: `Allow`
   - Priority: `300`
   - Name: `Allow-HTTP`
6. Select **Add**.

For RDP port `3389`, restrict the source to your own public IP whenever
possible instead of allowing all internet traffic.

## 10. Test from your own computer

Open:

```text
http://YOUR_VM_PUBLIC_IP/HTMLApp/
```

For example:

```text
http://20.30.40.50/HTMLApp/
```

Also test the individual page URLs using the same public IP.

The dashboard loads `pages.json` with JavaScript. It is expected to work
through IIS, but it may not work when `index.html` is opened directly with a
`file:///` URL. Test through `http://localhost/HTMLApp/` or the VM public URL.

## 11. Add future pages

Create the HTML file in the appropriate folder, for example:

```text
C:\HTMLApp\tools\invoice-generator.html
```

Then add an entry to `pages.json`:

```json
{
  "title": "Invoice Generator",
  "url": "tools/invoice-generator.html",
  "description": "Create a simple invoice in the browser.",
  "category": "Tool"
}
```

Copy the new file to the same folder on the VM and refresh the dashboard.
The new card will be generated automatically.

## 12. Update the site

Copy changed local files to the matching VM paths:

```text
tools\salary-filter.html -> C:\HTMLApp\tools\salary-filter.html
assets\styles.css        -> C:\HTMLApp\assets\styles.css
pages.json               -> C:\HTMLApp\pages.json
```

Refresh the browser. Use `Ctrl+F5` if the browser shows an older cached copy.

## Troubleshooting

### IIS welcome page appears

Use the application URL, including the virtual directory:

```text
http://localhost/HTMLApp/
```

### 404 for `/HTMLApp/`

Confirm that `C:\HTMLApp\index.html` exists and verify the virtual directory:

```powershell
Get-WebVirtualDirectory -Site "Default Web Site"
```

### Dashboard says pages cannot be loaded

Confirm that these files exist:

```text
C:\HTMLApp\pages.json
C:\HTMLApp\assets\app.js
C:\HTMLApp\assets\styles.css
```

Also use an `http://` URL rather than opening the page directly from disk.

### Public URL does not work

Check all three layers:

```powershell
Get-Service -Name W3SVC
Get-NetTCPConnection -LocalPort 80
```

Confirm that IIS is running, Windows Firewall allows port 80, and the Azure
network security group allows port 80.

## Stop or delete the test environment

When finished, select **Stop** on the VM Overview page. Disks and some
networking resources can still incur charges while a VM is stopped.

For a temporary test environment, delete the entire `HTMLApp-Test-RG`
resource group after confirming that it contains no resources you need:

1. Open **Resource groups** in Azure Portal.
2. Select `HTMLApp-Test-RG`.
3. Select **Delete resource group**.
4. Type the resource group name and confirm.
