'use strict';
const NodeHelper = require('node_helper');
const moment = require('moment');
const fetch = require("fetch");

module.exports = NodeHelper.create({
    config: {},
    data_day_1: [],
    data_day_2: [],
    timeout_id: undefined,
    
    start_fetching: async function (config) {
        this.config = config;
        const now = moment();
        const res = await this.getData(moment(now).add(1, "days"));
        if (res === undefined) {
            this.data_day_1 = await this.getData(moment(now).subtract(1, "days"));
            this.data_day_2 = await this.getData(now);
        } else {
            this.data_day_1 = await this.getData(now);
            this.data_day_2 = res;
        }
        this.sendData();
        //set timer for next day at 13:00
        this.timeout_id = setTimeout(() => {this.update();}, moment(this.data_day_2[0].time_start).hours(13)-moment());
    },
    
    update: async function () {
        //try to fetch next days prices. According to the documentation it will be avalible not before 13:00 the day before
        const res = await this.getData(moment().add(1, "days"));
        if (res != undefined) {
            this.data_day_1 = this.data_day_2;
            this.data_day_2 = res;
            this.sendData();
            //set timer for next day at 13:00
            this.timeout_id = setTimeout(() => {this.update();}, moment(this.data_day_2[0].time_start).hours(13)-moment());
        } else {
            //try again in 10 minutes
            this.timeout_id = setTimeout(() => {this.update();}, 1000*60*10);
        }
    },

    getData: async function (date) {
        let url = 'https://www.elprisetjustnu.se/api/v1/prices/';
        url = url + date.format("YYYY/MM-DD");
        url = url + "_"+this.config.area+".json";
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            return data;
        } catch(error) {
            return undefined;
        }
    },

    convertData: function (raw_data) {
        const data_points = [];
        for (let i = 0; i < raw_data.length; i++) {
            const y = (this.config.currency == "kr") ? raw_data[i].SEK_per_kWh : raw_data[i].EUR_per_kWh;
            data_points.push({label: String(i%24), y: y});
        }
        return data_points;
    },
    
    sendData: function () {
        const data = this.data_day_1.concat(this.data_day_2);
        const data_points = this.convertData(data)
        this.sendSocketNotification('ELPRISET_NEW_DATA', {start_date: this.data_day_1[0].time_start, data_points: data_points});
    },
    
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'ELPRISET_START') {
            this.start_fetching(payload);
        } else if (notification === 'ELPRISET_STOP') {
            clearTimeout(this.timeout_id);
            this.timeout_id = undefined;
		}
    }
});
