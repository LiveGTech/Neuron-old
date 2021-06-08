# Neuron (Old)
Backend system for storing documents and data under LiveG Accounts.

> **Note:** This repo is deprecated as we're redesigning Neuron to be peer-to-peer. [Take a look at our new repo!](https://github.com/LiveGTech/Neuron)

Licenced by the [LiveG Open-Source Licence](LICENCE.md).

## Neuron's architecture
Neuron is written using pure [Node.js](https://nodejs.org) and uses [Express](http://expressjs.com) as its web server. Neuron uses a central cloud server with a fast file cache, and multiple slower storage nodes for larger or less frequently accessed files.

## Manual install
To install manually, clone this repo using `git clone https://github.com/LiveGTech/Neuron.git`, change directory into the repo, and run `npm install`, followed by `npm -g install .`. You may need to use `sudo` in front of the `npm` commands if your system produces errors.

## Run
Once installed, use `neuron` to start the server.
