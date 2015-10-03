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
 
// DOM required
// ====================================
require('../css/tideline.less');
require('./less/test.less');

// DOM not required
// ====================================

require('./polyfill/function.prototype.bind');

/* js/ */
require('./tidelinedata_test');
/* js/data/ */
require('./constants_test');
require('./format_test');
require('./datetime_test');
require('./basalutil_test');
require('./bgutil_test');
require('./bolusutil_test');

/* js/plot/ */
require('./annotations_test');
require('./commonbolus_test');

/* plugins/ */
require('./basics_classifiers_test');
require('./basics_datamunger_test');
require('./nurseshark_test');
