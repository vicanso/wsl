// Copyright 2019 tree xie
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package validate

import (
	"github.com/asaskevich/govalidator"
)

func init() {
	Add("xBookKeyword", func(i interface{}, _ interface{}) bool {
		return checkStringLength(i, 1, 20)
	})

	Add("xBookHot", func(i interface{}, _ interface{}) bool {
		value, ok := i.(int)
		if !ok {
			return false
		}
		return govalidator.InRangeInt(value, 1, 100)
	})

	Add("xBookSummary", func(i interface{}, _ interface{}) bool {
		return checkStringLength(i, 1, 2000)
	})

	Add("xBookCover", func(i interface{}, _ interface{}) bool {
		value, ok := i.(string)
		if !ok {
			return false
		}
		return govalidator.IsRequestURI(value)
	})
}
