'use strict';

function filtersService($q, $location, globalSettings, utilsFactory, resultsService) {

    var self = this;
    this.activeFilters = {};

    this.createTouristicCategoryFilters = function (categories) {

        if (!self.filters) {
            self.initGlobalFilters();
        }

        angular.forEach(categories, function (category) {
            var newCategory = {
                label: category.label,
                id: category.id,
                type1: [],
                type2: []
            };

            if (category.type1 && category.type1.values.length > 0) {
                newCategory.type1 = category.type1;
            }

            if (category.type2 && category.type2.values.length > 0) {
                newCategory.type2 = category.type2;
            }

            if (category.type === 'treks') {
                newCategory.difficulty = [];
                if (category.difficulty.values.length > 0) {
                    newCategory.difficulty = category.difficulty;
                }
                if (category.route.values.length > 0) {
                    newCategory.route = category.route;
                }
                newCategory.duration = category.duration;
                newCategory.ascent = category.ascent;
                newCategory.eLength = category.eLength;
            }

            self.filters.categories.push(newCategory);
        });

    };

    this.initGlobalFilters = function (results) {

        if (!self.filters) {
            self.filters = {
                categories:     [],
                themes:         [],
                districts:      [],
                cities:         [],
                structure:      [],
                search:         ''
            };
        }

        if (results) {
            angular.forEach(results, function (result) {
                self.addPropertyToFilters(result.properties.themes, 'themes');
                self.addPropertyToFilters(result.properties.districts, 'districts');
                self.addPropertyToFilters(result.properties.cities, 'cities');
                self.addPropertyToFilters(result.properties.structure, 'structure');

            });
        }

        return self.filters;

    };

    self.addPropertyToFilters = function (property, propertyName) {
        if (property) {
            if (typeof property !== 'object') {
                property = [property];
            }

            if (property.length > 0) {
                angular.forEach(property, function (value) {
                    if (!(utilsFactory.idIsInArray(self.filters[propertyName], value)) && value !== undefined) {
                        return self.filters[propertyName].push(value);
                    }
                });
            }
        }
 
        return false;
    };

    this.getFilters = function () {
        return self.filters;
    };

    this.getAFilter = function (id, type, subtype, subId) {
        var filter = null;
        if (type === 'search') {
            filter = {
                id: id,
                label: id
            };
        } else {
            var filters = self.getFilters();

            angular.forEach(filters[type], function (currentFilter) {
                if (!subtype) {
                    if ((currentFilter.id && currentFilter.id.toString() === id.toString()) || (currentFilter.code && currentFilter.code.toString() === id.toString())) {
                        filter = currentFilter;
                    }
                } else {

                    if (subId.indexOf('-') > -1 && currentFilter[subtype]) {
                        var min = subId.split('-')[0],
                            max = subId.split('-')[1],
                            minFilter = null,
                            maxFilter = null;

                        angular.forEach(currentFilter[subtype].values, function (currentSubFilter) {
                            if (currentSubFilter.id.toString() === min.toString()) {
                                minFilter = currentSubFilter;
                            }
                            if (currentSubFilter.id.toString() === max.toString()) {
                                maxFilter = currentSubFilter;
                            }
                        });

                        if (minFilter && maxFilter) {
                            filter = {id: subId};
                            if (minFilter.id.toString() === maxFilter.id.toString()) {
                                filter.label = minFilter.label;
                            } else {
                                filter.label = minFilter.label + ' -> ' + maxFilter.label;
                            }
                        }

                    } else {
                        if (currentFilter.id.toString() === id.toString()) {
                            angular.forEach(currentFilter[subtype].values, function (currentSubFilter) {
                                if (currentSubFilter.id.toString() === subId.toString()) {
                                    filter = currentSubFilter;
                                }
                            });
                        }
                    }
                }
            });
        }

        return filter;
    };

    this.getSelectedFilters = function (activeFilters) {
        var selectedFilters = [];

        angular.forEach(activeFilters, function (aFilter, index) {
            var type = index,
                id = 0,
                subtype = null,
                subId = null;

            if (index.indexOf('_') > -1) {
                type = 'categories';
                id = index.split('_')[0];
                subtype = index.split('_')[1];
            }

            if (typeof aFilter === 'string') {
                aFilter = [aFilter];
            }

            angular.forEach(aFilter, function (aSubFilter) {

                if (subtype) {
                    subId = aSubFilter;
                } else {
                    id = aSubFilter;
                }

                var tempElement = self.getAFilter(id, type, subtype, subId);
                var tagElement = {
                    id: tempElement.id || tempElement.code,
                    label: tempElement.label || tempElement.name,
                    type: type,
                    typeId: id,
                    subtype: subtype,
                    queryLabel: index
                };
                selectedFilters.push(tagElement);
            });

        });

        return selectedFilters;
    };

    this.testByString = function (element, query) {

        var result = false;
        element = _.values(element);

        angular.forEach(element, function (property) {
            if (!result) {
                if (typeof property === 'string') {
                    var regex = new RegExp(query, 'gi');
                    if (property.match(regex) !== null) {
                        result = true;
                    }
                } else if (typeof property === 'object') {
                    result = self.testByString(property, query);
                }
            }

        });

        return result;
    };

    this.testById = function (element, filter, filterKey) {
        var result = false,
            currentElement;

        if (!element) {
            return false;
        }
        // Try to find the filter element as a direct child of our element, else test element itself
        if (element[filterKey]) {
            currentElement = element[filterKey];
        } else {
            currentElement = element;
        }

        if ((currentElement.id && currentElement.id.toString() === filter.toString()) || (currentElement.code && currentElement.code.toString() === filter.toString())) {
            result = true;
        } else {
            // If element is an object or an array, we can browse it to find the filter
            if (typeof currentElement === 'object') {
                angular.forEach(currentElement, function (subelement) {
                    if (self.testById(subelement, filter, filterKey)) {
                        result = true;
                    }
                });
            }
        }

        return result;
    };


    this.matchAny = function (element, filters, name, matchBy) {

        var result = false;

        // If matchBy is not defined or equal id, we are looking for the id matching the filter
        if (matchBy === undefined || matchBy === 'id') {

            // $location provide a string if there's only one value, an array if there's more
            if (typeof filters === 'string') {
                result = self.testById(element, filters, name);
            } else {
                angular.forEach(filters, function (filter) {
                    // VAL X OR VAL Y
                    // We set true for any value that pass
                    if (self.testById(element, filter, name)) {
                        result = true;
                    }
                });
            }

        }

        // We want to filter element by a value withing an interval
        if (matchBy === 'interval' && element[name]) {
            var min = filters.toString().split('-')[0],
                max = filters.toString().split('-')[1],
                elementId = element[name].id || element[name];

            if (parseInt(min, 10) <= parseInt(elementId, 10) && parseInt(elementId, 10) <= parseInt(max, 10)) {
                result = true;
            }
        }

        return result;
    };

    this.categoryHasSubfilters = function (elementCategoryId, filters) {
        var catSubFilters = {};

        angular.forEach(filters, function (filter, filterName) {
            // subfilters are composed like catId-subFilterName
            if (filterName.indexOf('_') > -1) {
                var categoryId = filterName.split('_')[0],
                    filterKey = filterName.split('_')[1];

                if (categoryId.toString() === elementCategoryId.toString()) {

                    //Init catSubfilters child if it doesn't exists
                    if (!catSubFilters[filterKey]) {
                        catSubFilters[filterKey] = [];
                    }
                    catSubFilters[filterKey] = filter;
                }
            }
        });

        return catSubFilters;
    };

    this.filtersChanged = function (filters) {
        return !angular.equals(filters, self.activeFilters);
    };

    this.updateActiveFilters = function () {
        self.activeFilters = $location.search();
    };

    this.getFilteredResults = function (forceRefresh) {
        var deferred = $q.defer(),
            filters = $location.search();

        resultsService.getAllResults(forceRefresh)
            .then(
                function (results) {
                    self.filteredResults = [];
                    angular.forEach(results, function (result) {
                        if (self.filterElement(result, filters)) {
                            self.filteredResults.push(result);
                        }
                    });
                    deferred.resolve(self.filteredResults);
                }
            );

        return deferred.promise;
    };

    this.filterElement = function (element, filters) {

        // Set Up final test vars
        var categoriesFilter = false,
            themesFilter = false,
            searchFilter = false,
            citiesFilter = false,
            districtsFilter = false,
            structureFilter = false;

        // Define all type of filters that needs an interval check instead of an id one
        var filtersByInterval = ['difficulty', 'duration', 'ascent', 'eLength'];


        // Update service activeFilters
        self.activeFilters = filters;


        /* Filter by Categories */
        /*                  */
        /*                  */

        // Use default active categories from config if there's no categories filter
        if (filters.categories) {

            // We can look for category subfilters if the element category match
            if (self.matchAny(element.properties.category, filters.categories, 'category')) {

                var subFilters = self.categoryHasSubfilters(element.properties.category.id, filters);
                // if no subfilters found, then whole category filter pass
                if (_.size(subFilters) > 0) {
                    var subfiltersResults = [];
                    angular.forEach(subFilters, function (subFilter, subFilterName) {
                        if (filtersByInterval.indexOf(subFilterName) > -1) {
                            subfiltersResults.push(self.matchAny(element.properties, subFilter, subFilterName, 'interval'));
                        } else {
                            subfiltersResults.push(self.matchAny(element.properties, subFilter, subFilterName));
                        }

                    });
                    if (subfiltersResults.indexOf(false) === -1) {
                        categoriesFilter = true;
                    }

                } else {
                    categoriesFilter = true;
                }

            }

        } else {
            categoriesFilter = self.matchAny(element, globalSettings.DEFAULT_ACTIVE_CATEGORIES, 'category');
        }


        /* Filter by Themes */
        /*                  */
        /*                  */

        // If themes filter is not defined the test pass
        if (filters.themes) {
            themesFilter = self.matchAny(element.properties, filters.themes, 'themes');
        } else {
            themesFilter = true;
        }


        /* Filter by Search Query */
        /*                        */
        /*                        */

        // If search is not defined the test pass
        if (filters.search) {
            searchFilter = self.testByString(element.properties, filters.search);
        } else {
            searchFilter = true;
        }


        /* Filter by cities */
        /*                 */
        /*                 */

        // If cities filter is not defined the test pass
        if (filters.cities) {
            citiesFilter = self.matchAny(element.properties, filters.cities, 'cities');
        } else {
            citiesFilter = true;
        }


        /* Filter by Districts */
        /*                     */
        /*                     */

        // If district filter is not defined the test pass
        if (filters.districts) {
            districtsFilter = self.matchAny(element.properties, filters.districts, 'districts');
        } else {
            districtsFilter = true;
        }


        /* Filter by Districts */
        /*                     */
        /*                     */

        // If district filter is not defined the test pass
        if (filters.structure) {
            structureFilter = self.matchAny(element.properties, filters.structure, 'structure');
        } else {
            structureFilter = true;
        }


        // CATEGORY && THEME && QUERY && CITY && DISTRICT
        // Global test that pass if all filters test are true
        return categoriesFilter && themesFilter && searchFilter && citiesFilter && districtsFilter && structureFilter;

    };

}

module.exports = {
    filtersService : filtersService
};