import { sunComputeLocation, toRegLong } from '../src/js/celestial';
import { assert } from 'chai';

const tests = [
    // 10:08 austin
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 87.37, altitude: 44.71 },
        date: new Date(1591283305000)
    },

    // 11 austin
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 94.06, altitude: 55.83 },
        date: new Date(1591286400000)
    },

    // 10:31 austin
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 90.1, altitude: 49.58 },
        date: new Date(1591284660000)
    },

    // 4:00pm austin - sun to east
    {
        here: { lat: 30.316947, long: -97.740393 },
        altAz: { azimuth: 266.14, altitude: 55.59 },
        date: new Date(1591304400000)
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
            const { lat, long } = sunComputeLocation(t.altAz, t.date)
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

