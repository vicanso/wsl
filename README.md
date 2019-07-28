# wsl


## 测试环境

```bash
  docker run \
  -p 5432:5432 \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=123456 \
  --restart=always \
  --name=shark \
  -d postgres:alpine
```

```
# 切换用户
psql -U test

CREATE USER vicanso WITH PASSWORD '123456';

CREATE DATABASE "novel" OWNER vicanso;

GRANT ALL PRIVILEGES ON DATABASE "novel" to vicanso;

```
