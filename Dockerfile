FROM node:slim

RUN apt-get update
RUN mkdir -p /webtorrent
RUN mkdir -p /var/app
COPY ./webtorrent-nest.js /var/app/webtorrent-nest.js
COPY ./webtorrent-thread.js /var/app/webtorrent-thread.js
COPY ./package.json /var/app/package.json
COPY ./package-lock.json /var/app/package-lock.json
WORKDIR /var/app/
RUN npm install
EXPOSE 7071
ENTRYPOINT ["node", "/var/app/webtorrent-nest.js"]
