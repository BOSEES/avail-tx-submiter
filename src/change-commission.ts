import { getDecimals, initialize, formatNumberToBalance, getKeyringFromSeed, isValidAddress } from "avail-js-sdk"
import config from "../config"

/**
 * Example of change commission with status end event tracking.
 */
const main = async () => {
    try {
        const api = await initialize(config.endpoint)
        const keyring = getKeyringFromSeed(config.seed)
        const options = { app_id: 0, nonce: -1 }
        const validatorStash = keyring.address;

        const perBill = 1000000000
        const commission = (config.changeCommissionRate / 100) * perBill
        const validatorPrefs = await api.query.staking.validators(validatorStash);

        await api.tx.staking
            .validate({
                commission,
                blocked: false 
            })
            .signAndSend(keyring, options, ({ status, events }) => {  
                if (status.isInBlock) {
                console.log(`Transaction included at blockHash ${status.asInBlock}`)

                events.filter(({ event : { section, method }}) => {
                    return section === 'system' && method === 'ExtrinsicFailed'
                })
                .forEach(({ event: { data, section, method, meta} }) => {
                    console.log(`\t' ${section}.${method}:: ${data.toString()}`);
                    throw new Error(`Invalid Transaction! ${meta.docs}`)
                });
                
                events.forEach(({ event: { data, method, section }}) => {
                    if (section === "staking" && method === "ValidatorPrefsSet") {
                        console.log(`Success change commission`)
                        console.log("Prev: ", validatorPrefs.toHuman())
                        console.log("Changed: ", data.toHuman())
                    }                    
                })

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
