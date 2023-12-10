# mmm-elpriset-just-nu

Magic mirror module for showing electricity spot prices in Sweden. The data source is https://www.elprisetjustnu.se. The exchange rate used for converting from EUR to SEK is collected from exchangeratesapi.io and may differ slightly from the rate used by Nordpool but the relatice change during a day is exact.

Config:
- currency: "kr", // can also be 'eur'
- area: "SE3", // can also be "SE1", "SE2" and "SE4"
- updateInterval: 1000\*60\*1, //1 minute. This is how often the current time indicator is updated. Change depending on your screen resolution.
- title: "Elprisetjustnu.se" //prefix of the header
  
![elpriset_screenshot](https://github.com/markusbergqvist/mmm-elpriset-just-nu/assets/849217/04c3f600-1a4c-44a2-b213-4d5d6e5ffdd5)
