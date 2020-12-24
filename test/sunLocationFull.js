import { sunComputeLocation, toRegLong, computeLocation } from '../src/js/celestial';
import { assert } from 'chai';

const tests = [

    // Azimuths are from Geo NP since that's what online calculators use, so an offset is
    // included for each. Each for Austin since the bearing to MagNP is 356, 4 degrees are
    // added to azimuth
    // 10:08 austin
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 87.37 + 4, altitude: 44.71 },
        date: new Date(1591283305000) // 2020-06-04T15:08:25+00:00
        // sun loc - import
    },

    // 11 austin
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 94.06 + 4, altitude: 55.83 },
        date: new Date(1591286400000) // 2020-06-04T16:00:00+00:00
    },

    // 10:31 austin
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 90.1 + 4, altitude: 49.58 },
        date: new Date(1591284660000) // 2020-06-04T15:31:00+00:00
    },

    // 4:00pm austin - sun to east
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 266.14 + 4, altitude: 55.59 },
        date: new Date(1591304400000) // 2020-06-04T21:00:00+00:00
    },

    // cape verde
    // here west of utc, sun east of utc
    {
        here: { lat: 15.876809, long: -23.99414 },
        altAz: { azimuth: 73.5 , altitude: 53.06 },
        date: new Date("2020-06-04T10:00:00.000-01:00")
    },

    // tunis 
    // here east of utc, sun west
    {
        here: { lat: 36.738884, long: 10.1074218 },
        altAz: { azimuth: 269.55, altitude: 40.45 },
        date: new Date("2020-06-04T16:00:00.000+01:00")
    }
]

describe("Computed location vs known location given Alt/Az at given time", function () {
    var testWithData = function (t) {
        return function () {
            const { here, celestial } = sunComputeLocation(t.altAz, t.date)
            const { lat, long } = here
            const latErr = Math.abs(lat - t.here.lat)
            const longErr = Math.abs(toRegLong(long) - t.here.long)
            assert.isBelow(latErr, 1, "latitude error is below 1 degree")
            assert.isBelow(longErr, 1, "latitude error is below 1 degree")
        };
    };

    tests.forEach(function (dataItem) {
        it("Diff between actual and expected Lat/Long less that 1 degree", testWithData(dataItem));
    });
});

