<div align="center" width="100%">
    <img src="./frontend/public/icon.svg" width="128" alt="" />
</div>

# Dockge (cnrwil fork)

A fancy, easy-to-use and reactive self-hosted docker compose.yaml stack-oriented manager — extended with multi-user access control, audit logging, stack tagging, scheduled tasks, backup/export, resource monitoring, compose validation, and a diff view.

[![GitHub Repo stars](https://img.shields.io/github/stars/cnrwil/dockge?logo=github&style=flat)](https://github.com/cnrwil/dockge) [![GitHub last commit (branch)](https://img.shields.io/github/last-commit/cnrwil/dockge/master?logo=github)](https://github.com/cnrwil/dockge/commits/master/)

> **Forked from** [louislam/dockge](https://github.com/louislam/dockge). All original features are preserved.

---

## ⭐ Features

### Original features
- 🧑‍💼 Manage your `compose.yaml` files — Create / Edit / Start / Stop / Restart / Delete / Update images
- ⌨️ Interactive editor for `compose.yaml`
- 🦦 Interactive web terminal
- 🕷️ Multiple agents support — manage stacks across different Docker hosts from one interface
- 🏦 Convert `docker run ...` commands into `compose.yaml`
- 📙 File-based structure — compose files live on your drive and work with normal `docker compose` commands
- 🚄 Reactive — real-time progress and terminal output
- 🐣 Easy-to-use & fancy UI

### 🔒 Multi-user support with role-based access control
Three roles with clearly defined permissions:
| Role | What they can do |
|---|---|
| **Admin** | Full access including user management and settings |
| **Operator** | Start / stop / create / edit / delete stacks and use the terminal |
| **Viewer** | Read-only — view stacks and logs |

Admins can create, deactivate, delete users and reset passwords from a dedicated User Management page.

### 📝 Audit log
Every significant action is recorded — who did what, when, and from which IP. Covers auth events (login, failed login, token login), all stack operations, user management changes, and settings updates. The admin UI offers paginated browsing, filtering by user or action category, and a pruning tool for old entries.

### 🏷️ Stack groups and tagging
Attach colour-coded free-form tags to any stack. Tags are displayed inline on stack cards and can be used to group stacks in the sidebar. Tags can be renamed or deleted globally across all stacks at once.

### 🔗 Stack dependencies
Declare that one stack must be running before another starts. The `Start with dependencies` command polls every 3 seconds (up to 120 seconds) until all declared dependencies are in a running state before starting the target stack. Circular dependencies are detected and rejected at save time.

### ⏰ Scheduled tasks
Schedule cron-based tasks against any stack — start, stop, restart, or pull/update images on a schedule. Uses standard 5-field cron expressions. Tasks can be enabled/disabled individually without being deleted, and the last run time is recorded.

### 📦 Stack backup and export
Export any stack as a ZIP archive containing its `compose.yaml` and `.env` file with a single click. The browser download is triggered automatically. Stacks can also be restored from a previously exported ZIP.

### 📊 Per-stack resource usage
View a real-time snapshot of CPU %, memory usage, and network I/O for every container in a stack, with a summary view showing totals. Data is pulled from `docker stats --no-stream` and can be refreshed on demand.

### ✅ Compose validation before deploy
As you type in the compose editor, your YAML is validated in real-time using `docker compose config`. Errors are shown in a red banner with the exact error message from Docker. Warnings (e.g. obsolete fields) appear in yellow. The check is debounced at 800ms so it doesn't fire on every keystroke.

### 🔍 Diff view on edit
Before saving or deploying, a git-style diff is shown comparing the current compose YAML against the previously saved version. The last 20 versions of each stack's compose file are stored in the database and can be browsed or restored from the history panel.

---

## 🔧 How to Install

Requirements:
- [Docker](https://docs.docker.com/engine/install/) 20+ / Podman
- (Podman only) `podman-docker` (Debian: `apt install podman-docker`)
- A Docker network named `reverseproxy-nw` must exist (see below)
- OS: Ubuntu, Debian (Bullseye+), Raspbian (Bullseye+), CentOS, Fedora, ArchLinux
- Arch: armv7, arm64, amd64

### Create the reverse proxy network (once)

```bash
docker network create reverseproxy-nw
```

This fork does not expose any ports directly. Dockge should be accessed via a reverse proxy (e.g. Nginx Proxy Manager, Traefik, Caddy) connected to the `reverseproxy-nw` network.

### Install

```bash
mkdir -p /opt/stacks /opt/dockge
cd /opt/dockge

# Download the compose.yaml
curl https://raw.githubusercontent.com/cnrwil/dockge/master/compose.yaml --output compose.yaml

# Start the server
docker compose up -d
```

Dockge will be available via your reverse proxy. The internal application port is **5001**.

### How to Update

```bash
cd /opt/dockge
docker compose pull && docker compose up -d
```

---

## 📸 Screenshots

![](https://github.com/louislam/dockge/assets/1336778/e7ff0222-af2e-405c-b533-4eab04791b40)

![](https://github.com/louislam/dockge/assets/1336778/7139e88c-77ed-4d45-96e3-00b66d36d871)

![](https://github.com/louislam/dockge/assets/1336778/f019944c-0e87-405b-a1b8-625b35de1eeb)

![](https://github.com/louislam/dockge/assets/1336778/a4478d23-b1c4-4991-8768-1a7cad3472e3)

---

## 🗣️ Community and Contribution

### Bug Reports
https://github.com/cnrwil/dockge/issues

### Upstream Project
https://github.com/louislam/dockge

---

## FAQ

#### Can I manage a single container without `compose.yaml`?
The main objective of Dockge is docker-compose stack management. For single containers, use Portainer or the Docker CLI.

#### Can I manage existing stacks?
Yes. Move your compose file into `/opt/stacks/<stackName>/compose.yaml`, then click **Scan Stacks Folder** in the top-right dropdown.

#### Can I use a port directly instead of a reverse proxy?
Yes — add a `ports` section back to `compose.yaml` and remove the `networks` block if you prefer direct port access.

#### Is this a Portainer replacement?
For compose-only workflows, yes. For managing individual containers or Docker networks directly, Portainer is still more capable.

---

## Others

Dockge is built on top of [Compose V2](https://docs.docker.com/compose/migrate/). `compose.yaml` is also known as `docker-compose.yml`.
