FROM alpine:3.19.1 AS builder
RUN apk add --no-cache nodejs npm
WORKDIR /build
COPY . .
RUN npm ci
RUN ls -al
ENV NODE_ENV production
RUN node build.js

FROM alpine:3.19.1
RUN apk add --no-cache nodejs
COPY --from=ghcr.io/choffmeister/pdfmake-cli:0.1.0 /usr/lib/pdfmake-cli /usr/lib/pdfmake-cli
RUN ln -s /usr/lib/pdfmake-cli/pdfmake-cli /usr/local/bin/pdfmake-cli
RUN apk add --no-cache imagemagick imagemagick-pdf
RUN apk add --no-cache poppler-utils
ENV NODE_ENV production
WORKDIR /app
COPY --from=builder /build/dist .
RUN addgroup -g 1000 myfolio && adduser -u 1000 -G myfolio -s /bin/sh -D myfolio
USER myfolio:myfolio
ENTRYPOINT ["node", "--enable-source-maps", "index.js"]
EXPOSE 3000
