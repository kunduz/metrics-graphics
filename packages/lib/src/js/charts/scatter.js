import AbstractChart from './abstractChart'
import Delaunay from '../components/delaunay'
import constants from '../misc/constants'
import Rug from '../components/rug'
import { makeAccessorFunction } from '../misc/utility'

/**
 * Creates a new scatter graph.
 *
 * @param {Object} args argument object. See {@link AbstractChart} for general parameters.
 * @param {String | Function} [args.sizeAccessor=d=>3] accesor specifying the size of a data point. Can be either a string (name of the size field) or a function (receiving a data point and returning its size).
 * @param {Boolean} [args.xRug=false] whether or not to generate a rug for the x axis.
 * @param {Boolean} [args.yRug=false] whether or not to generate a rug for the y axis.
 */
export default class ScatterChart extends AbstractChart {
  points = []
  delaunay = null
  delaunayPoint = null
  sizeAccessor = null
  xRug = null
  xRugParams = null
  yRug = null
  yRugParams = null
  _activePoint = { i: -1, j: -1 }

  constructor ({ sizeAccessor, xRug, yRug, ...args }) {
    super(args)
    this.xRugParams = xRug ?? this.xRugParams
    this.yRugParams = yRug ?? this.yRugParams

    this.sizeAccessor = sizeAccessor
      ? makeAccessorFunction(sizeAccessor)
      : () => 3

    this.redraw()
  }

  redraw () {
    // set up rugs if necessary
    this.mountRugs(this.xRugParams, this.yRugParams)

    // set tooltip type
    if (this.tooltip) {
      this.tooltip.update({ legendObject: constants.legendObject.circle })
      this.tooltip.hide()
    }

    // set up points
    this.mountPoints()

    // generate delaunator
    this.mountDelaunay()

    // mount legend if any
    this.mountLegend(constants.legendObject.circle)

    // mount brush if necessary
    this.mountBrush(this.brush)
  }

  /**
   * Mount new rugs.
   *
   * @param {Boolean} [xRug=false] whether or not to generate a rug for the x axis.
   * @param {Boolean} [yRug=false] whether or not to generate a rug for the y axis.
   * @returns {void}
   */
  mountRugs (xRug, yRug) {
    if (xRug) {
      this.xRug = new Rug({
        accessor: this.xAccessor,
        scale: this.xScale,
        colors: this.colors,
        data: this.data,
        left: this.plotLeft,
        top: this.innerHeight + this.plotTop + this.buffer,
        orientation: constants.orientation.horizontal // TODO how to pass tickLength etc?
      })
      this.xRug.mountTo(this.content)
    }
    if (yRug) {
      this.yRug = new Rug({
        accessor: this.yAccessor,
        scale: this.yScale,
        colors: this.colors,
        data: this.data,
        left: this.left,
        top: this.plotTop,
        orientation: constants.orientation.vertical
      })
      this.yRug.mountTo(this.content)
    }
  }

  /**
   * Mount scatter points.
   * @returns {void}
   */
  mountPoints () {
    this.points = this.data.map((pointSet, i) => pointSet.map(data => {
      const point = this.generatePoint({
        data,
        color: this.colors[i],
        radius: this.sizeAccessor(data),
        fillOpacity: 0.3,
        strokeWidth: 1
      })
      point.mountTo(this.container)
      return point
    }))
  }

  /**
   * Handle incoming points from the delaunay triangulation.
   *
   * @returns {Function} handler function
   */
  onPointHandler () {
    return ([point]) => {
      this.activePoint = { i: point.arrayIndex ?? 0, j: point.index }

      // set tooltip if necessary
      if (!this.tooltip) return
      this.tooltip.update({ data: [point] })
    }
  }

  /**
   * Handle leaving the delaunay area.
   *
   * @returns {Function} handler function
   */
  onLeaveHandler () {
    return () => {
      this.activePoint = { i: -1, j: -1 }
      if (this.tooltip) this.tooltip.hide()
    }
  }

  /**
   * Mount new delaunay triangulation instance.
   * @returns {void}
   */
  mountDelaunay () {
    this.delaunayPoint = this.generatePoint({ radius: 3 })
    this.delaunay = new Delaunay({
      points: this.data,
      xAccessor: this.xAccessor,
      yAccessor: this.yAccessor,
      xScale: this.xScale,
      yScale: this.yScale,
      nested: true,
      onPoint: this.onPointHandler(),
      onLeave: this.onLeaveHandler()
    })
    this.delaunay.mountTo(this.container)
  }

  set activePoint ({ i, j }) {
    // if a point was previously set, de-set it
    if (this._activePoint.i !== -1 && this._activePoint.j !== -1) {
      this.points[this._activePoint.i][this._activePoint.j].update({ fillOpacity: 0.3 })
    }

    // set state
    this._activePoint = { i, j }

    // set point to active
    if (i !== -1 && j !== -1) this.points[i][j].update({ fillOpacity: 1 })
  }

  normalizeData () {
    if (this.isArrayOfObjects) this.data = [this.data]
  }
}
