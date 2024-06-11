import { initialize, getKeyringFromSeed, ApiPromise, isValidAddress } from "avail-js-sdk"
import config from "../config"
import rewardedEras from "./status/rewarded_eras.json"
import fs from "fs"
import path from "path"
import util from "util"

const writeFileAsync = util.promisify(fs.writeFile);

type ActiveEraStructType = {
  index: number
  start: number
}

type RewardPointsType = {
  total: number
  individual: {
    [address: string]: number; // validator account id
  }
}

const main = async () => {
  try {
    const api = await initialize(config.endpoint)
    const keyring = getKeyringFromSeed(config.seed)
    const options = { app_id: 0, nonce: -1 }
    const validatorStash = keyring.address;

    if (!isValidAddress(validatorStash)) throw new Error("Invalid Validator")
    
    const activeEra = (await api.query.staking.activeEra()).toJSON() as ActiveEraStructType
    const eraEntryPoint = await getEraEntryPoint(api, validatorStash, activeEra.index);

    if (eraEntryPoint <= -1 || eraEntryPoint >= activeEra.index) {
      console.log("No Era to receive rewards.")
      process.exit(0)
    }

    const rewardEras = await getRewardEras(api, validatorStash, eraEntryPoint, activeEra);

    const BatchTx = payoutAllInBatch(api, rewardEras, validatorStash);
    await BatchTx
      .signAndSend(keyring, options, async ({ status, events, }) => {  
        if (status.isInBlock) {
          console.log(`Transaction included at blockHash ${status.asInBlock}`)
          events.filter(({ event : { section, method }}) => {
            return section === 'utility' && method === 'BatchInterrupted' ||
            section === 'system' && method === 'ExtrinsicFailed'
          })
          .forEach(({ event: { data, section, method, meta} }) => {
            console.log(`\t' ${section}.${method}:: ${data.toString()}`);
            throw new Error(`Invalid Transaction! ${meta.docs}`)
          });

          events.forEach(({ event: { data, method, section }}) => {
            console.log(`\t' ${section}.${method}:: ${data}`);
          })
          
          await saveRewardedEras(rewardEras)

          process.exit(0)
        }
      });
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
main()

async function getEraEntryPoint(api: ApiPromise, validatorStash: string, activeEraIndex: number): Promise<number> {
  if (rewardedEras.latestRewardedEra <= 0) {
    for (let startEra = 0; startEra < activeEraIndex; startEra++) {
      const rewardPoints = (await api.query.staking.erasRewardPoints(startEra)).toJSON() as RewardPointsType;

      if (rewardPoints.total == 0) {
        continue
      } 

      if (rewardPoints.individual[validatorStash] !== undefined) {
        return startEra
      } 
    }

    return -1
  }

  return rewardedEras.latestRewardedEra + 1
}

async function getRewardEras(api: ApiPromise, validatorStash: string, eraEntryPoint: number, activeEraStruct: ActiveEraStructType): Promise<number[]> {
  const rewardEras: number[] = [];

  for (let era = eraEntryPoint; era < activeEraStruct.index; era++) {
    const rewardPoints = (await api.query.staking.erasRewardPoints(era)).toJSON() as RewardPointsType;
    
    if (rewardPoints.total == 0) {
      continue;
    }

    if (rewardPoints.individual[validatorStash] !== undefined) {
      console.log(`Find era points that can be rewarded!
      Validator Stash: ${validatorStash}
      Era Index: ${era}
      Era Point: ${rewardPoints.individual[validatorStash]}
      =====================================================`)
      rewardEras.push(era);
    }    
  }

  return rewardEras;
}

function payoutAllInBatch(api: ApiPromise, rewardEras: number[], validatorStash: string) {
  const calls = rewardEras.map(era => api.tx.staking.payoutStakers(validatorStash, era));
  const batchCall = api.tx.utility.batchAll(calls);

  return batchCall;
}

async function saveRewardedEras(eras: number[]) {
  const latestRewardedEra: number = eras[eras.length - 1]
  const prevRewardedHistory: number[] = rewardedEras.rewardedHistory as number[];
  for (let i = 0; i < eras.length; i++) {
    prevRewardedHistory.push(eras[i]);
  }

  const saveRewardedEras = {
    latestRewardedEra: latestRewardedEra,
    rewardedHistory: prevRewardedHistory,
  }


  const jsonString = JSON.stringify(saveRewardedEras, null, 2);

  const filePath = path.join(__dirname, '../../src/status', 'rewarded_eras.json');
  const buildPath = path.join(__dirname, './status', 'rewarded_eras.json');


  // dump json for payout history
  try {
    await writeFileAsync(filePath, jsonString);
    await writeFileAsync(buildPath, jsonString);
    console.log('Success save json file');
  } catch (err) {
    console.error('Failed save json file:', err);
    process.exit(1)
  }
}
