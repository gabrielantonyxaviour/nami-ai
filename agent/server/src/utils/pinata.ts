import { PinataSDK } from "pinata";

export default async function uploadJSONToPinata(jsonObject: any) {
  const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: "amethyst-impossible-ptarmigan-368.mypinata.cloud",
  });

  // Convert JSON object to string
  const jsonString = JSON.stringify(jsonObject, null, 2);

  // Create a File object from the JSON string
  const file = new File(
    [jsonString],
    jsonObject.title + Math.floor(Math.random() * 10000) + ".json",
    {
      type: "application/json",
    }
  );

  // Upload to Pinata
  const upload = await pinata.upload.file(file);
  console.log("JSON Upload successful:", upload);
  const url = await pinata.gateways.createSignedURL({
    cid: upload.cid,
    expires: 99999999999,
  });
  console.log(url);
  return url;
}
