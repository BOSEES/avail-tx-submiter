import { getDecimals, initialize, formatNumberToBalance, getKeyringFromSeed, isValidAddress } from "avail-js-sdk"
import config from "../config"

/**
 * Example of staking with status end event tracking.
 */
const main = async () => {
  if (!isValidAddress(config.validator)) throw new Error("Invalid Validator")

  try {
    const api = await initialize(config.endpoint)
    const keyring = getKeyringFromSeed(config.seed)
    const options = { app_id: 0, nonce: -1 }
    const decimals = getDecimals(api)
    const amount = formatNumberToBalance(config.bondAmount, decimals)
    
    await api.tx.staking
      .bondExtra(amount)
      .signAndSend(keyring, options, ({ status, events }) => {  
        if (status.isInBlock) {
          console.log(`Transaction included at blockHash ${status.asInBlock}`)
          events.forEach(({ event: { data, method, section }}) => {
            console.log(`\t' ${section}.${method}:: ${data}`);
          })
          process.exit(0)
        }
      });
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
main()
