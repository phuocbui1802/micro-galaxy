Audience Serv Development Guide
=====================

### Setup
```
- docker-compose build
- docker-compose up
- docker-compose exec node bash
- npm run dev
- The thing will probably be running at http://localhost:3000
```

## NPM scripts

- `npm run dev`: Start development mode (load all services locally with hot-reload & REPL)
- `npm run start`: Start production mode (set `SERVICES` env variable to load certain services)
- `npm run cli`: Start a CLI and connect to production. Don't forget to set production namespace with `--ns` argument in script

### Convention
```
- Use semicolons
- Check [standard](https://github.com/standard/standard/blob/master/RULES.md) for the rest of the rules.
```
