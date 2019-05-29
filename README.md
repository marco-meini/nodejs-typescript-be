# nodejs-typescript-be

Nodejs + Express typescript backend template

## Configuration

### Environment configuration:
In *config*, create a `config.json` and fill with your parameters:

```json
{
  "logLevel": 4,
  "db": {
    "database": "MyDatabaseName",
    "user": "DatabaseUser",
    "password": "DatabaseUserPassword",
    "options": {
      "host": "MyDatabaseHost",
      "dialect": "postgres",
      "pool": {
        "max": 20
      },
      "operatorsAliases": false
    }
  },
  "mongoDb": {
    "host": "[ip-address]",
    "port": 27017,
    "db": "[database-name]",
    "auth": {
      "user": "[database-username]",
      "password": "[database-password]"
    }
  },
  "sessionCookieName": "my-site-sid",
  "sessionHeaderName": "my-site-sid",
  "sessionExpiration": {
    "short": 7890000,
    "long": 31536000
  },
  "apiRoot": "/api/v1",
  "fileServerRootPath": "/path/to/files",
  "fileServerPrivateFolder": "private",
  "fileServerPublicFolder": "public",
  "sparkpost": {
    "api": "sparkpost-api"
  },
  "jwtExpiration": 86400
}
```
#### DATABASE

This project use Sequelize, so _db_ configurations must be compiled according to the library's requirements.

#### LOG

_logLevel_ possible values:

* Only errors => 1
* Errors + Warnings => 2
* Errors + Warnings + Info => 3
* Errors + Warnings + Info + Sql => 4

#### SESSION

Using JWT session it's necessary to install mongoDb to manage a whitelist, only in this case it's also necessary to complie this configurations:

* sessionExpiration: tokens expirations in seconds
* redisOptions: redis connection configurations