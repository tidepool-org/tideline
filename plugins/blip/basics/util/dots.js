var React = require('react');

var DOT_SIZE = 16;
var PAD = 1.5;

/**
 * Utility function for getting a dot
 * 
 * @param  {Number}  i
 * @param  {String} typeKey
 * 
 * @return {JSX}
 */
function drawDot(i, type, dotSize, pad) {
  var manual;

  dotSize = dotSize || DOT_SIZE;
  pad = pad || PAD;
  manualDotSize = ((dotSize/2) + 1)/2;

  if (type === 'b') {
    manual = <circle className="Dot-innerCircle" cx={dotSize/2} cy={dotSize/2} r={manualDotSize - pad}/>;
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