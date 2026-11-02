# Reverse-Engineering Tooling (installed in this sandbox)

## REA — Reverse Engineer Anything
- Source: https://github.com/morluto/rea (MIT) · npm package `rea-agents`
- Installed: `rea-agents@6.8.0` globally (`npm install -g rea-agents`)
- Setup: `rea setup --yes` executed (reported `status: ready`); `rea doctor` runs and reports Node 22.23.4 healthy.
- Usage examples:
  - `rea doctor` — environment health check
  - `rea capabilities` — list the 90+ analysis subcommands
  - `rea analyze <target>` / `rea decompile <binary>` — agent-driven analysis
- REA doctor output after Ghidra provisioning shows the **ghidra provider: healthy** at `~/tools/ghidra12`.

## Ghidra 12.1.3 (NSA SRE framework)
- Downloaded from the official `NationalSecurityAgency/ghidra` GitHub release (`Ghidra_12.1.3_build`, `ghidra_12.1.3_PUBLIC_20260817.zip`).
- Extracted to `~/tools/ghidra12` (12.2 was also downloaded to `~/tools/ghidra` but its launcher rejects the Temurin build in this image; 12.1.3 is the version REA's provider registration expects).
- JDK: Eclipse Temurin OpenJDK **21.0.13 LTS** at `~/tools/jdk` (apt is not available to this sandbox user, so the JDK is user-local).
- Shell exports persisted in `~/.bashrc`:
  - `JAVA_HOME=$HOME/tools/jdk`
  - `PATH=$HOME/tools/jdk/bin:$HOME/tools/ghidra12:$PATH`
  - `GHIDRA_INSTALL_DIR=$HOME/tools/ghidra12`
- Headless usage (this sandbox has no display):
  ```bash
  source ~/.bashrc
  analyzeHeadless ~/proj proj1 -import /path/to/binary -postScript MyScript.java
  ```
  `ghidraRun` (GUI) requires an X display and intentionally exits here.
- REA integration: `rea doctor` reports `ghidra: ok, /home/user/tools/ghidra12`.

## Notes / constraints
- This sandbox is headless; GUI tools (Ghidra GUI, Hopper) cannot run. `analyzeHeadless` covers scripted binary analysis.
- REA's MCP server can be attached to an agent client on a developer machine (`rea setup` and pick the client); here it operates as a CLI.
