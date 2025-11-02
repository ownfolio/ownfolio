FROM alpine:3.21.2 AS builder
RUN apk add --no-cache nodejs npm
WORKDIR /build
COPY . .
RUN npm ci
RUN ls -al
ENV NODE_ENV=production
RUN node build.js

FROM alpine:3.21.2
RUN apk add --no-cache nodejs
COPY --from=ghcr.io/ownfolio/pdfmake-cli:0.1.1 /usr/lib/pdfmake-cli /usr/lib/pdfmake-cli
RUN ln -s /usr/lib/pdfmake-cli/pdfmake-cli /usr/local/bin/pdfmake-cli
RUN apk add --no-cache imagemagick imagemagick-pdf
RUN apk add --no-cache poppler-utils
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /build/dist .
RUN addgroup -g 1000 ownfolio && adduser -u 1000 -G ownfolio -s /bin/sh -D ownfolio
USER ownfolio:ownfolio
ENTRYPOINT ["node", "--enable-source-maps", "index.js"]
CMD ["server"]
EXPOSE 3000
