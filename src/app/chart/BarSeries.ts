import { D3ChartType, ChartDatum, XDomainType, TRANSITION_DURATION } from './chart.model';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ScaleBand, ScaleLinear, ScaleTime } from 'd3';
import * as d3 from 'd3';


export class BarSeries implements D3ChartType {

  color: string;
  label: string;
  parentSelector: any;
  smoothStyle: boolean;
  xDomainType: XDomainType;
  interval: number;
  private datumFocus: any;

  // Scale band
  private _scaleBandX: ScaleBand<string>;

  set scaleBandX(scale) {
    this._scaleBandX = scale;
    this.smoothRadius = this.scaleBandX.bandwidth() / 5;
  }
  get scaleBandX() {
    return this._scaleBandX;
  }

  // xScale
  private _xScale: ScaleLinear<number, number> | ScaleTime<number, number>;
  set xScale(scale: ScaleLinear<number, number> | ScaleTime<number, number>) {
    this._xScale = this.xDomainType === 'time' ?
      (scale as ScaleTime<number, number>) :
      (scale as ScaleLinear<number, number>);;
  }
  get xScale(): ScaleLinear<number, number> | ScaleTime<number, number> {
    return this.xDomainType === 'time' ?
      (this._xScale as ScaleTime<number, number>) :
      (this._xScale as ScaleLinear<number, number>);
  }

  // yScale
  private _yScale: ScaleLinear<number, number>;
  set yScale(scale) {
    this._yScale = scale;
  }
  get yScale() {
    return this._yScale;
  }

  private smoothRadius: number;

  constructor(
    color: string,
    label: string,
    scaleBandX: ScaleBand<string>,
    xDomainType: XDomainType,
    interval: number,
    smooth: boolean) {
    this.interval = interval;
    this.color = color;
    this.label = label;
    this.scaleBandX = scaleBandX;
    this.xDomainType = xDomainType;
    this.smoothStyle = smooth;
    this.parentSelector = d3.select(`#series${_.replace(this.color, '#', '')}`);

    this.datumFocus = this.parentSelector
      .append(this.smoothStyle ? 'path' : 'rect')
      .attr('fill', d3.hsl(color).brighter());
  }

  getXPosition = (d: ChartDatum) => {
    switch (this.xDomainType) {
      case 'number':
        return (this.xScale as ScaleLinear<number, number>)(
          (d.x as number) - (this.interval / 2)) +
          this.scaleBandX(this.label);
      case 'time':
        return (this.xScale as ScaleTime<number, number>)(
          moment(d.x).subtract(this.interval / 2, 's')) +
          this.scaleBandX(this.label);
    }
  }

  updateFocus(datumToHighlight: ChartDatum) {
    if (datumToHighlight) {
      this.datumFocus
        .attr('display', 'visible');
      this.smoothStyle ? this.datumFocus
        .attr('d', this.topRoundedRect(
          this.getXPosition(datumToHighlight),
          this.yScale(datumToHighlight.y),
          this.scaleBandX.bandwidth(),
          this.yScale(0) - this.yScale(datumToHighlight.y)
        )) :
        this.datumFocus
          .attr('width', this.scaleBandX.bandwidth())
          .attr('height', this.yScale(0) - this.yScale(datumToHighlight.y))
          .attr('x', this.getXPosition(datumToHighlight))
          .attr('y', this.yScale(datumToHighlight.y));
      this.datumFocus.raise();
    } else {
      this.datumFocus.attr('display', 'none');
    }
  }

  private topRoundedRect(x: number, y: number, w: number, h: number): string {
    return 'M' + x + ',' + (y + h) // Bottom left corner
      // Vertical line
      + 'v' + (-(h - this.smoothRadius))
      // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
      + 'a' + this.smoothRadius + ',' + this.smoothRadius + ' 0 0 ,1 ' + this.smoothRadius + ',' + -this.smoothRadius
      // Top line
      + 'h' + (w - (2 * this.smoothRadius))
      // Right top corner
      + 'a' + this.smoothRadius + ',' + this.smoothRadius + ' 0 0 ,1 ' + this.smoothRadius + ',' + this.smoothRadius
      // Vertical line
      + 'v' + (h - this.smoothRadius)
      // Close path
      + 'z';
  }

  update: Function = (data: Array<ChartDatum>): void => {
    const rects = this.parentSelector
      .selectAll(`.barsColor${_.replace(this.color, '#', '-')}`)
      .data(_.filter(data, d => !_.isNil(d) && !_.isNil(d.x)));

    rects.exit()
      .transition()
      .duration(TRANSITION_DURATION)
      .attr('opacity', this.smoothStyle ? 0 : null)
      .attr('height', 0)
      .attr('y', this.yScale(0))
      .remove();

    if (this.smoothStyle) {
      const rectsToUpdate = rects.enter()
        .append('path')
        .attr('class', `bars barsColor${_.replace(this.color, '#', '-')}`)
        .attr('fill', this.color)
        .attr('y', this.yScale(0))
        .attr('height', 0)
        .merge(rects);
      rectsToUpdate.transition()
        .duration(250)
        .attr('opacity', 1)
        .attr('d', d => this.topRoundedRect(
          this.getXPosition(d),
          this.yScale(d.y),
          this.scaleBandX.bandwidth(),
          this.yScale(0) - this.yScale(d.y)
        ));
    } else {
      const rectsToUpdate = rects.enter()
        .append('rect')
        .attr('class', `bars barsColor${_.replace(this.color, '#', '-')}`)
        .attr('fill', this.color)
        .attr('y', this.yScale(0))
        .attr('height', 0)
        .merge(rects);
      rectsToUpdate.attr('x', d => this.getXPosition(d))
        .attr('width', this.scaleBandX.bandwidth())
        .transition()
        .duration(TRANSITION_DURATION)
        .attr('height', d => this.yScale(0) - this.yScale(d.y))
        .attr('y', d => this.yScale(d.y));
    }
  }
}

