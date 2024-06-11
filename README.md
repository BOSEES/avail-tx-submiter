# Avail typescript / javascript examples!

Sample examples written in typescript using avail-js sdk that demonstrate interaction with Avail network.
The following scripts have been tested with `ts-node v10.9.1 node v16.19.0 (npm v8.19.3)`.
Those examples are meant to show how to use the avail-js sdk. It's worth noting that when using this package, all polkadot-js features can be used as it's only a wrapper with additional types / rpc / helpers.

## Avail node examples

To run some examples using node js, you can follow those instructions

- Install dependencies.

```
npm install
```

- Install ts-node

```
npm i -g ts-node
```

- Make sure to populate basic configuration in `config.ts` or leave the default if using local node. Take a look at the scripts for more details about
  the configuration.

```typescript
export default {
  seed: "bottom drive obey lake curtain smoke basket hold race lonely fit walk", // menimonic 12 phase
  endpoint: "wss://goldberg.avail.tools/ws",
  appId: 0, //default
  amount: 1, // send amount ex) 1 avail
  recipient: "", // account id for token transfer
  validator: "", // validator stash account id
  bondAmount: 1, // staking amount ex) 1 avail
  changeCommissionRate: 5// ex) 5%
}
```

### Run the examples

- Run the command related to the example you want to execute:

```
npm run connect
npm run transfer
npm run data-submission
npm run data-submission-async
npm run create-app-id
npm run subscribe-blocks
npm run query-app-data
npm run query-proof
npm run query-proof-data
npm run submit-proposal
npm run dispatch-data-root
npm run staking
npm run payout-all
npm run change-commmission
```
