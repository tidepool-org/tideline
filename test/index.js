/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

require('./polyfill/function.prototype.bind');

// DOM required
// ====================================

/* plugins/ */
require('./chartbasicsfactory_test');
require('intl/locale-data/jsonp/en.js');


// DOM not required
// ====================================

/* js/data/ */
require('./constants_test');
require('./format_test');
require('./datetime_test');
require('./basalutil_test');

/* js/plot/ */
require('./annotations_test');
require('./commonbolus_test');
require('./device_test');

require('./blip/components/day/hover/InfusionHoverDisplay.test.js');
require('./blip/components/logic/actions.test.js');
require('./blip/components/misc/SummaryGroup.test.js');
require('./blip/components/sitechange/Selector.test.js');
require('./blip/components/BasicsUtils.test.js');
require('./blip/components/CalendarContainer.test.js');
