# Neuron
Backend system for storing documents and data under LiveG Accounts.

Licenced by the [LiveG Open-Source Licence](LICENCE.md).

## Neuron's architecture
Neuron is written using pure [Node.js](https://nodejs.org) and uses [Express](http://expressjs.com) as its web server. Neuron uses a central cloud server with a fast file cache, and multiple slower storage nodes for larger or less frequently accessed files.

## One-line install
To install, globally, run:
```bash
npm install -g https://github.com/LiveGTech/Neuron.git
```

## Manual install
To install manually, clone this repo using `git clone https://github.com/LiveGTech/Neuron.git`, change directory into the repo, and run `npm install`, followed by `npm -g install .`.

## Run
Once installed, use `neuron` to start the server.
