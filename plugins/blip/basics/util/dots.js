var dotSize = 16;
var manualDotRadius = 4.5;
var pad = 1.5


/**
 * Utility function for getting a dot
 * 
 * @param  {Number}  i
 * @param  {Boolean} isManual
 * 
 * @return {JSX}
 */
function drawDot(i, isManual) {
  var manual;

  if (isManual) {
    manual = <circle className="Fingerstick--manual" cx={dotSize/2} cy={dotSize/2} r={manualDotRadius - pad}/>;
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