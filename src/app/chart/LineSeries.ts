import * as _ from 'lodash';
import * as d3 from 'd3';
import { D3ChartType, ChartDatum } from './chart.model';

export class LineSeries implements D3ChartType {

  // XScale
  private _xScale: d3.ScaleTime<number, number> | d3.ScaleLinear<number, number>;
  set xScale(scale) {
    this._xScale = scale;
  }
  get xScale() {
    return this._xScale;
  }

  // yScale
  private _yScale: d3.ScaleLinear<number, number>;
  set yScale(scale) {
    this._yScale = scale;
  }
  get yScale() {
    return this._yScale;
  }

  readonly color: string;
  readonly label: string;

  readonly parentSelector;

  private showCircles: boolean;
  private showDataGaps: boolean;
  private datumFocus: any;
  smoothStyle: boolean;

  constructor(
    color: string,
    label: string,
    showCircles: boolean,
    smooth: boolean,
    showDataGaps?: boolean
  ) {
    this.color = color;
    this.label = label;
    this.showCircles = showCircles;
    this.smoothStyle = smooth;
    this.showDataGaps = showDataGaps;

    this.parentSelector = d3.select(`#series${_.replace(this.color, '#', '')}`);
    this.datumFocus = this.parentSelector.append('circle')
      .attr('fill', this.color);

    // Init empty path
    this.parentSelector
      .append('path')
      .datum([])
      .attr('class', `series lines linesColor${_.replace(this.color, '#', '')}`)
      .attr('fill', 'none')
      .attr('stroke', this.color)
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round');
  }

  updateFocus(datumToHighlight: ChartDatum) {
    if (datumToHighlight) {
      this.datumFocus
        .attr('r', 5)
        .attr('display', 'visible')
        .attr('cx', this.xScale(datumToHighlight.x))
        .attr('cy', this.yScale(datumToHighlight.y));
    } else {
      this.datumFocus.attr('display', 'none');
    }
  }

  update(data: Array<ChartDatum>): void {
    let dataMatrix;
    if (this.showDataGaps) {
      dataMatrix = _.chain(data)
        .reduce(function (acc, value) {
          _.isNil(value) ?
            acc.push(new Array()) :
            _.last(acc).push(value);
          return acc;
        }, [new Array()])
        .filter(d => _.size(d) > 1)
        .value();
    } else {
      dataMatrix = [_.filter(data, d => !_.isNil(d))];
    }

    const lines = this.parentSelector
      .selectAll(`.linesColor${_.replace(this.color, '#', '')}`)
      .data(dataMatrix);

    // If showDataGaps === true, use the update pattern for each path
    if (this.showDataGaps) {
      lines.exit().remove();
      lines.enter()
        .append('path')
        .attr('class', `series lines linesColor${_.replace(this.color, '#', '')}`)
        .attr('fill', 'none')
        .attr('stroke', this.color)
        .attr('stroke-width', 2)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .merge(lines)
        .attr('d', d3.line()
          .curve(this.smoothStyle ? d3.curveCardinal : d3.curveLinear)
          .x((v) => this.xScale(_.get(v, 'x')))
          .y((v) => this.yScale(_.get(v, 'y')))
        );
    } else {
      // If there's a single line, we don't use the update pattern
      lines.attr('d', d3.line()
        .curve(this.smoothStyle ? d3.curveCardinal : d3.curveLinear)
        .x((v) => this.xScale(_.get(v, 'x')))
        .y((v) => this.yScale(_.get(v, 'y')))
      );
    }

    if (this.showCircles) {
      const circles = this.parentSelector.selectAll(`.circlesColor${_.replace(this.color, '#', '-')}`)
        .data(_.filter(data, d => !_.isNil(d)));
      circles.exit().remove();
      circles.enter()
        .append('circle')
        .attr('class', `circles circlesColor${_.replace(this.color, '#', '-')}`)
        .attr('r', 1.5)
        .attr('fill', 'none')
        .attr('stroke', this.color)
        .merge(circles)
        .attr('cx', d => this.xScale(d.x))
        .attr('cy', d => this.yScale(d.y));
    }

    this.parentSelector.raise();
  }
}