import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';

import { StatusHeatmapCtrl } from './module';

let TOOLTIP_PADDING_X = 30;
let TOOLTIP_PADDING_Y = 5;

export class StatusmapTooltip {
  tooltip: any;
  scope: any;
  dashboard: any;
  panelCtrl: StatusHeatmapCtrl;
  panel: any;
  heatmapPanel: any;
  mouseOverBucket: any;
  originalFillColor: any;

  constructor(elem: any, scope: any) {
    this.scope = scope;
    this.dashboard = scope.ctrl.dashboard;
    this.panelCtrl = scope.ctrl;
    this.panel = scope.ctrl.panel;
    this.heatmapPanel = elem;
    this.mouseOverBucket = false;
    this.originalFillColor = null;

    elem.on("mouseover", this.onMouseOver.bind(this));
    elem.on("mouseleave", this.onMouseLeave.bind(this));
  }

  onMouseOver(e) {
    if (!this.panel.tooltip.show || !this.scope.ctrl.data || _.isEmpty(this.scope.ctrl.data)) { return; }

    if (!this.tooltip) {
      this.add();
      this.move(e);
    }
  }

  onMouseLeave() {
    this.destroy();
  }

  onMouseMove(e) {
    if (!this.panel.tooltip.show) { return; }

    this.move(e);
  }

  add() {
    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "statusmap-tooltip graph-tooltip grafana-tooltip");
  }

  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
    }

    this.tooltip = null;
  }

  show(pos) {
    if (!this.panel.tooltip.show || !this.tooltip) { return; }
    
    // TODO support for shared tooltip mode
    if (pos.panelRelY) {
      return;
    }
    let cardEl = d3.select(pos.target);
    let yid = cardEl.attr('yid');
    let xid = cardEl.attr('xid');
    let bucket = this.panelCtrl.bucketMatrix.get(yid, xid); // TODO string-to-number conversion for xid
    if (!bucket || bucket.isEmpty()) {
      this.destroy();
      return;
    }

    let timestamp = bucket.to;
    let name = bucket.yLabel;
    let value = bucket.value;
    let values = bucket.values;
    let tooltipTimeFormat = 'YYYY-MM-DD HH:mm:ss';
    let time = this.dashboard.formatDate(+timestamp, tooltipTimeFormat);

    let tooltipHtml = `<div class="graph-tooltip-time">${time}</div>
      <div class="statusmap-histogram"></div>`;

    let statuses;

    if (this.panel.color.mode === 'discrete') {
      if (this.panel.seriesFilterIndex >= 0) {
        statuses = this.panelCtrl.discreteExtraSeries.convertValueToTooltips(value);
      } else {
        statuses = this.panelCtrl.discreteExtraSeries.convertValuesToTooltips(values);
      }
      
      let statusesHtml = '';
      if (statuses.length === 1) {
        statusesHtml = "status:";
      } else if (statuses.length > 1) {
        statusesHtml = "statuses:";
      }
      tooltipHtml += `
      <div>
        name: <b>${name}</b> <br>
        ${statusesHtml}
        <ul>
          ${_.join(_.map(statuses, v => `<li style="background-color: ${v.color}" class="discrete-item">${v.tooltip}</li>`), "")}
        </ul>
      </div>`;
    } else {
      if (values.length === 1) {
        tooltipHtml += `<div> 
      name: <b>${name}</b> <br>
      value: <b>${value}</b> <br>
      </div>`;
      } else {
        tooltipHtml += `<div>
      name: <b>${name}}</b> <br>
      values:
      <ul>
        ${_.join(_.map(values, v => `<li>${v}</li>`), "")}
      </ul>
      </div>`;
      }
    }

    //   "Ambiguous bucket state: Multiple values!";
    if (!this.panel.useMax && bucket.multipleValues) {
      tooltipHtml += `<div><b>Error:</b> ${this.panelCtrl.dataWarnings.multipleValues.title}</div>`;
    }

    // Discrete mode errors
    if (this.panel.color.mode === 'discrete') {

      if (bucket.noColorDefined) {
        let badValues = this.panelCtrl.discreteExtraSeries.getNotColoredValues(values);
        tooltipHtml += `<div><b>Error:</b> ${this.panelCtrl.dataWarnings.noColorDefined.title}
        <br>not colored values:
        <ul>
          ${_.join(_.map(badValues, v => `<li>${v}</li>`), "")}
        </ul>
        </div>`;

      }
    }

    this.tooltip.html(tooltipHtml);

    this.move(pos);
  }

  move(pos) {
    if (!this.tooltip) { return; }

    let elem = $(this.tooltip.node())[0];
    let tooltipWidth = elem.clientWidth;
    let tooltipHeight = elem.clientHeight;

    let left = pos.pageX + TOOLTIP_PADDING_X;
    let top = pos.pageY + TOOLTIP_PADDING_Y;

    if (pos.pageX + tooltipWidth + 40 > window.innerWidth) {
      left = pos.pageX - tooltipWidth - TOOLTIP_PADDING_X;
    }

    if (pos.pageY - window.pageYOffset + tooltipHeight + 20 > window.innerHeight) {
      top = pos.pageY - tooltipHeight - TOOLTIP_PADDING_Y;
    }

    return this.tooltip
      .style("left", left + "px")
      .style("top", top + "px");
  }
}
