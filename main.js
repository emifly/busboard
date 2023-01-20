import PromptSync from "prompt-sync";

const prompt = PromptSync();

const postcode = prompt("Enter a postcode to search by: ").replace(/\s/g, "");

const postcodeIsValid = await fetch(`https://api.postcodes.io/postcodes/${postcode}/validate`)
  .then(response => response.json())
  .then(postcodeValidityData => postcodeValidityData.result);

if (!postcodeIsValid) {
  console.log("Please retry with a valid postcode.");
  process.exit();
}

const { region, latitude, longitude } = await fetch(`https://api.postcodes.io/postcodes/${postcode}`)
  .then(response => response.json())
  .then(postcodeData => postcodeData.result);

if (region !== "London") {
  console.log("Please retry with a London postcode.");
  process.exit();
}

const busStops = await fetch(`https://api.tfl.gov.uk/StopPoint/?lat=${latitude}&lon=${longitude}&stopTypes=NaptanPublicBusCoachTram&radius=1000`)
  .then(response => response.json())
  .then(busStopData => busStopData.stopPoints?.sort((busStopA, busStopB) => busStopA.distance - busStopB.distance).slice(0, 2));

if (!busStops || !busStops.length) {
  console.log("No bus stops nearby.");
  process.exit();
}

for (const busStop of busStops) {
  console.log(`\n>>> ${busStop.commonName} (~${Math.round(busStop.distance)}m away)`);

  const arrivals = await fetch(`https://api.tfl.gov.uk/StopPoint/${busStop.id}/Arrivals`)
    .then(response => response.json())
    .then(arrivalData => arrivalData.sort((arrivalA, arrivalB) => arrivalA.timeToStation - arrivalB.timeToStation).slice(0, 5));

  if (!arrivals || !arrivals.length) {
    console.log("No imminent arrivals for this stop.");
  } else {
    arrivals.forEach(arrival => {
      console.log(`${arrival.lineName.padEnd(5)} to ${arrival.destinationName.padEnd(30)} | ${Math.round(arrival.timeToStation / 60).toString().padStart(3)} minute(s)`);
    });
  }
}
