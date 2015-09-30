var React = require('react');

var DOT_SIZE = 16;
var PAD = 1.5;

var MANUAL_DOT_RADIUS = 4.5;


/**
 * Utility function for getting a dot
 * 
 * @param  {Number}  i
 * @param  {Boolean} isManual
 * 
 * @return {JSX}
 */
function drawDot(i, isManual, dotSize, pad) {
  var manual;

  dotsize = dotSize || DOT_SIZE;
  pad = pad || PAD;

  if (isManual) {
    manual = <circle className="Fingerstick--manual" cx={dotSize/2} cy={dotSize/2} r={MANUAL_DOT_RADIUS - pad}/>;
  }

  return (
    <svg key={i} width={dotSize} height={dotSize}>
      <circle cx={dotSize/2} cy={dotSize/2} r={dotSize/2 - pad}/>
      {manual}
    </svg>
  );
}

module.exports = {
  drawDot: drawDot
};