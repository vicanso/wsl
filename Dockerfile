FROM node:12-alpine as webbuilder

ADD . /wsl
RUN apk update \
  && apk add git \
  && cd /wsl/web \
  && yarn \
  && yarn build \
  && rm -rf node_module

FROM golang:1.12-alpine as builder

COPY --from=webbuilder /wsl wsl/

RUN apk update \
  && apk add docker git make \
  && go get -u github.com/gobuffalo/packr/v2/packr2 \
  && cd /wsl \
  && make build

FROM alpine 

EXPOSE 7001

COPY --from=builder /wsl/wsl /usr/local/binwsl/


CMD ["wsl"]
