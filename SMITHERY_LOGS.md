**SMITHERY LOGS**

Loaded cached build files.
Using smithery.yaml from repository
Using Dockerfile from repository
Successfully obtained required build config files. Preparing build...
Building Docker image...
#5 transferring dockerfile:
#5 transferring dockerfile: 2.93kB 0.2s done
#5 DONE 0.2s
#6 ...
#7 [internal] load metadata for docker.io/library/node:20-alpine
#7 DONE 0.4s
#6 DONE 0.5s
#8 [internal] load .dockerignore
#8 transferring context: 33B 0.1s
#8 transferring context: 364B 0.2s done
#8 DONE 0.2s
#9 DONE 0.0s
#10 [stage-1  1/13] FROM docker.io/library/node:20-alpine@sha256:d3507a213936fe4ef54760a186e113db5188472d9efdf491686bd94580a1c1e8
#10 resolve docker.io/library/node:20-alpine@sha256:d3507a213936fe4ef54760a186e113db5188472d9efdf491686bd94580a1c1e8 0.0s done
#10 DONE 0.0s
#11 [internal] load build context
#11 transferring context: 744.46kB 0.7s done
#11 DONE 0.8s
#9 CACHED
#12 [stage-1  2/13] WORKDIR /app
#12 CACHED
#13 [stage-1  3/13] COPY package*.json ./
#13 CACHED
#14 [stage-1  4/13] RUN npm install --ignore-scripts
#14 CACHED
#15 [stage-1  5/13] COPY . .
#15 DONE 0.1s
#16 [stage-1  6/13] RUN npm run build
#16 0.698
#16 0.698 > exa-websets-mcp-server@1.0.4 build
#16 0.698 > tsc
#16 0.698
#16 DONE 3.7s
#17 [stage-1  7/13] RUN npm prune --production
#17 0.251 npm warn config production Use `--omit=dev` instead.
#17 1.496
#17 1.496 up to date, audited 104 packages in 1s
#17 1.496
#17 1.496 19 packages are looking for funding
#17 1.496   run `npm fund` for details
#17 1.497
#17 1.497 1 high severity vulnerability
#17 1.497
#17 1.497 To address all issues, run:
#17 1.497   npm audit fix
#17 1.497
#17 1.497 Run `npm audit` for details.
#17 DONE 1.5s
Starting deployment...
Deployment successful.
Scanning for tools...
Failed to scan tools list from server: McpError: MCP error -32001: Request timed out

Please ensure your server performs lazy loading of configurations: https://smithery.ai/docs/build/deployments#tool-lists