FROM node:slim

RUN apt-get update
RUN apt-get full-upgrade -y
RUN apt-get install -y libgtk2.0-0 libgconf-2-4 libasound2 libxtst6 libxss1 libnss3 xvfb git -y
RUN apt-get autoremove --purge -y
RUN rm -rf /var/lib/apt/lists/*
RUN npm install webtorrent-cli -g
RUN mkdir -p /webtorrent
RUN mkdir -p /var/app
COPY ./webtorrent-nest.js /var/app/webtorrent-nest.js
COPY ./package.json /var/app/package.json
COPY ./package-lock.json /var/app/package-lock.json
WORKDIR /var/app/
RUN npm install
EXPOSE 7071
ENTRYPOINT ["node", "/var/app/webtorrent-nest.js"]
