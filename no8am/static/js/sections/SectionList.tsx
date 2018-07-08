import * as React from "react";
import {connect} from "react-redux";
import {createSelector} from "reselect";

import {filterSectionsWithSearchItem, getAllSections,
        getSelectedSearchItemMemoized, getUniqueCCCs, getUnselectedSearchItemsMemoized} from "../Helpers";
import {IAllReducers, ISearchItem, ISectionExtra, Section} from "../Interfaces";

import GlobalFilters from "../filters/GlobalFilters";
import LookupFilters from "../filters/LookupFilters";
import {getSelectedSectionsForSearchItem} from "../sections/SectionReducer";
import SectionListCard from "./SectionListCard";
import SectionListManagedCard from "./SectionListManagedCard";

interface ISectionListProps {
    searchItem: ISearchItem;
}

interface ISectionListStateProps {
    availableCCCs: string[];
    filterTime: [number, number];
    isAdvanced: boolean;
    managedSections: Section[];
    sections: Section[];
    selectedSections: Section[];
}

class SectionList extends React.Component<ISectionListStateProps & ISectionListProps> {

    public render() {

        // TODO - fix cache time
        // const cacheTime = this.props.data.cache_time || new Date();

        const sectionCards = this.groupSectionsByType()
            .map((sectionGroup) => (
                <div key={sectionGroup[0].departmentAndCourse}>
                    {this.createCardsFromSectionGroup(sectionGroup)}
                </div>
            ));

        const visibleCount = this.props.sections
            .map((section) => this.isVisible(section) ? 1 : 0)
            .reduce((previousVisibleCount: number, nextVisibleCount) => previousVisibleCount + nextVisibleCount, 0);

        return (
            <div className="sectionList">
                <GlobalFilters />
                <LookupFilters
                    filterTime={this.props.filterTime}
                    searchItem={this.props.searchItem}
                    numberOfSectionsVisible={visibleCount}
                    numberOfSectionsTotal={this.props.sections.length}
                />
                {sectionCards}
            </div>
        );
    }

    private groupSectionsByType() {
        return this.props.sections.reduce((groupedSections: Section[][], currentSection: Section) => {
            const lastSectionGroup = groupedSections.slice(-1).pop();
            const otherSectionGroups = groupedSections.slice(0, -1);

            if (lastSectionGroup === undefined) {
                // first iteration, create a new section group
                return [[currentSection]];
            } else if (lastSectionGroup[0].departmentAndCourse === currentSection.departmentAndCourse ||
                       (lastSectionGroup[0].departmentAndBareCourse === currentSection.departmentAndBareCourse &&
                        this.isManaged(lastSectionGroup[0]) && this.isManaged(currentSection))) {
                // add section to last section group
                return [...otherSectionGroups, [...lastSectionGroup, currentSection]];
            } else {
                // create a new section group
                return [...groupedSections, [currentSection]];
            }
        }, []);
    }

    private createCardsFromSectionGroup(sections: Section[]): JSX.Element[] {
        const managedSections = sections.map((section) => this.isManaged(section));
        const visibleSections = sections.map((section) => this.isVisible(section));

        if (managedSections.every((isManaged) => isManaged)) {
            const course = sections[0].departmentAndBareCourse;
            return [(
                <SectionListManagedCard
                    key={course}
                    managedAbbreviation={course}
                />
            )];
        } else {
            // only add a margin to the bottom of a section group if at least one card in the group is visible
            const allHidden = visibleSections.every((isVisible) => !isVisible);

            return sections.map((section, index) => (
                <SectionListCard
                    key={section.CRN}
                    section={section}
                    addMargin={!allHidden && index === sections.length - 1}
                    isManaged={managedSections[index]}
                    isSelected={this.isSelected(section)}
                    isUnavailable={this.isUnavailable(section)}
                    isVisible={visibleSections[index]}
                />),
            );
        }
    }

    // handles case when another course card contains the course baseAbbreviation
    private isManaged(section: Section): boolean {
        return this.props.searchItem.currentItemCourseAbbreviation === null &&
        this.props.managedSections.find((managedSection) => managedSection.CRN === section.CRN) !== undefined;
    }

    // highlights selected sections and used to flag when a user selects an unavailable section
    private isSelected(section: Section): boolean {
        return this.props.selectedSections.find((selectedSection) => selectedSection.CRN === section.CRN) !== undefined;
    }

    // identifies if a section cannot be selected based on other selected sections
    private isUnavailable(section: Section): boolean {
        return this.props.selectedSections.find((selectedSection) =>
            section.departmentAndBareCourse === selectedSection.departmentAndBareCourse &&
            (section.main && !selectedSection.main &&
                !(selectedSection as ISectionExtra).dependent_main_sections.includes(section.sectionNum)) ||
            (!section.main && selectedSection.main &&
                !(section as ISectionExtra).dependent_main_sections.includes(selectedSection.sectionNum)))
            !== undefined;
    }

    private isVisible(section: Section): boolean {
        // section has already been selected
        return this.isSelected(section) || (
        // show sections despite registrar restrictions if advanced mode is enabled
                (this.props.isAdvanced || !this.isUnavailable(section)) &&
        // generic search was made and has not been narrowed down to a single course
                ((this.props.searchItem.currentItemCourseAbbreviation === null) ||
        // or search has been filtered for a single course
                (this.props.searchItem.currentItemCourseAbbreviation !== null &&
                 this.props.searchItem.currentItemCourseAbbreviation === section.departmentAndBareCourse)) &&
        // section is within filtered time range
                (section.meetingTimes.every((meetingTime) => meetingTime.startTime >= this.props.filterTime[0] &&
                                      meetingTime.duration + meetingTime.startTime <= this.props.filterTime[1])));
        // section has at least one CCC is in the CCC filter
        // TODO - handle sections that do not fill any CCC requirement
                // (section.CCC.find((currentCCC) =>
                //     this.props.availableCCCs.find((currentAvailableCCC) =>
                //         currentAvailableCCC === currentCCC) !== undefined) !== undefined);
    }
}

const getAllManagedSections = createSelector(
    [getAllSections, getUnselectedSearchItemsMemoized],
    (allSections, searchItems) => searchItems
        // filter for cards that are managing sections (card is responsible for a single course)
        .filter((searchItem) => searchItem.currentItemCourseAbbreviation !== null)
        // get all sections this search item is responsible for
        .map((searchItem) => filterSectionsWithSearchItem(searchItem, allSections, true))
        // flatten 2D list of managed sections
        .reduce((managedSectionsA, managedSectionsB) => managedSectionsA.concat(managedSectionsB), []),
);

const getSelectedSectionsForSelectedCourseCard = createSelector(
    [getAllSections, getSelectedSearchItemMemoized],
    // filter all sections by sections that match selected crns for the current card
    getSelectedSectionsForSearchItem,
);

const getSectionsForSelectedSearchItem = createSelector(
    [getSelectedSearchItemMemoized, getAllSections],
    (searchItem, allSections) => {
        if (searchItem === undefined) {
            return [];
        } else {
            return filterSectionsWithSearchItem(searchItem, allSections, false);
        }
    },
);

const getFilterCCCs = (state: IAllReducers) => state.filters.filterCCCs;

const getAvailableCCCs = createSelector(
    [getFilterCCCs, getUniqueCCCs],
    (filterCCCs, uniqueCCCs) => filterCCCs.length === 0 ? uniqueCCCs : filterCCCs,
);

const SectionListConnected = connect(
    (state: IAllReducers): ISectionListStateProps => ({
        availableCCCs: getAvailableCCCs(state),
        filterTime: state.filters.filterTime,
        isAdvanced: state.filters.isAdvanced,
        managedSections: getAllManagedSections(state),
        sections: getSectionsForSelectedSearchItem(state),
        selectedSections: getSelectedSectionsForSelectedCourseCard(state),
    }),
)(SectionList);

export default SectionListConnected;
