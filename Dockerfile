FROM node:26
ENV NODE_ENV=production
RUN ["npm", "-g", "i", "pnpm@10.23.0"]
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./
RUN ["pnpm", "install", "--frozen-lockfile"]
COPY . .
CMD ["pnpm", "start"]