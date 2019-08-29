FROM node:12-alpine as webbuilder

ADD . /wsl
RUN cd /wsl/web \
  && yarn \
  && yarn build \
  && rm -rf node_module

FROM golang:1.12-alpine as builder

COPY --from=webbuilder /wsl /wsl

RUN apk update \
  && apk add git make \
  && git clone --depth=1 https://github.com/vicanso/gocc.git /gocc \
  && go get -u github.com/gobuffalo/packr/v2/packr2 \
  && cd /wsl \
  && make build

FROM alpine 

EXPOSE 7001

RUN addgroup -g 1000 go \
  && adduser -u 1000 -G go -s /bin/sh -D go \
  && apk add --no-cache ca-certificates

COPY --from=builder /wsl/wsl /usr/local/bin/wsl
COPY --from=webbuilder /wsl/font /font
COPY --from=builder /gocc/config /usr/local/share/gocc/config
COPY --from=builder /gocc/dictionary /usr/local/share/gocc/dictionary

USER go

WORKDIR /home/go

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD [ "wget", "http://127.0.0.1:7001/ping", "-q", "-O", "-"]

CMD ["wsl"]
