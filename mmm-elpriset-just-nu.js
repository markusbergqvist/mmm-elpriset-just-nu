'use strict';

Module.register("mmm-elpriset-just-nu", {
    requiresVersion: "2.1.0",
    defaults: {
        currency: "kr", // can also be 'eur'
        area: "SE3", // can also be "SE1", "SE2" and "SE4"
        updateInterval: 1000*60*1, //1 minute
        title: "Elprisetjust.nu",
    },
    chart: undefined,
    chart_start_time: undefined,
    
    getScripts: function () {
        return [
            this.file('moment.min.js'),
            this.file('canvasjs.min.js')
        ];
    },

    getDom: function () {
        const chart_wrapper = document.createElement("div");
        chart_wrapper.className = "chartwrapper";
        this.chart = this.createChart(chart_wrapper);
        return chart_wrapper;
    },

    update: function () {
        this.chart.options.axisX.stripLines[0].value = moment.duration(moment()-this.chart_start_time).asHours();
        this.chart.render();
	},

    notificationReceived: function (notification, payload) {
        if (notification === "MODULE_DOM_CREATED") {
            //start worker
            this.sendSocketNotification('ELPRISET_START', this.config);
            //start updating the time indicator
            this.chart_start_time = moment(moment().add(-1, "day").format("YYYY-MM-DD")); //midnight yesterday
            setInterval(() => {this.update();}, this.config.updateInterval);
        }
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "ELPRISET_NEW_DATA") {
            this.chart_start_time = moment(payload.start_date);
            this.chart.options.title.text = this.config.title + " " + this.chart_start_time.format("dddd Do") + " - " + moment(this.chart_start_time).add(1, "days").format("dddd Do")
            this.chart.options.data[0].dataPoints = payload.data_points;
            this.update();
        }
    },

    createChart: function (element) {
        const suffix = this.config.currency;
        const chart = new CanvasJS.Chart(element, {
            theme: "dark1",
            backgroundColor: "",
            height: 250,
            title: {
                fontFamily: "Roboto Condensed",
                fontSize: 14,
                text: ""
            },
            axisY: {
                gridThickness: 0,
                labelFormatter: (e) => {
                    return e.value.toFixed(2)+suffix;
                }
            },
            axisX: {
                gridThickness: 0,
                interval: 1,
                stripLines: [
                    {
                        value: 0,
                        label: ""
                    }
                ]
            },
            data: [{
                type: "stepLine",
                markerSize: 0,
                color: "white",
                lineThickness: 0.7,
            }]
        });
        chart.render();
        return chart;
	}
});
