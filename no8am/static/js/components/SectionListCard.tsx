import * as React from 'react'
import {connect} from 'react-redux'
import {Icon} from '@blueprintjs/core'
import {Tooltip2} from '@blueprintjs/labs'
import Transition from 'react-transition-group/Transition'

import {mouseEnterSectionListCard, mouseLeaveSectionListCard, clickSectionListCard, clickShowSingleCourse} from "../actions/sectionActions"
import {ISection} from '../Interfaces'

const duration: number = 300;

const defaultStyle = {
    transition: `max-height ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`,
    maxHeight: 0,
    opacity: 0
};

const transitionStyles = {
    entering: { maxHeight: '100px', opacity: 1 },
    entered:  { maxHeight: '100px', opacity: 1 },
};

interface SectionListCardProps extends ISection {
    isSelected: boolean
    isUnavailable: boolean
    isVisible: boolean
    shouldAskShowSingleCourse: boolean
    isLastOfType: boolean
    isFromCategorySearch: boolean
}

@connect(mapStateToProps, mapDispatchToProps)
export default class SectionListCard extends React.Component<SectionListCardProps, undefined> {
    render() {

        // identify if section is selected and violates selection rules based on other selections
        let isViolation = this.props.isSelected && this.props.isUnavailable;

        let unavailableMessage = this.props.isUnavailable && !this.props.main ?
            `This section can be selected with one of the following main sections: ${this.props.dependent_main_sections}` :
            'This section cannot be selected due to other selections for this course';

        let classes = `${this.props.isSelected ? 'selectedSection' : ''} ${this.props.isUnavailable ? 'unavailableSection' : ''} ${isViolation ? 'violationSection' : ''} `;

        let showSingleCourse = this.props.shouldAskShowSingleCourse ? <a onClick={this.props.onClickShowSingleCourse} className="askShowSingleCourse">{`Only show sections for ${this.props.departmentAndBareCourse}?`}</a> : null;

        let sectionListCard = (
            <Transition
                in={this.props.isVisible}
                timeout={duration}
                mountOnEnter={true}
                unmountOnExit={true}>
                {(state) => (
                    <div>
                        <div className={`pt-card pt-interactive sectionCard ${this.props.isLastOfType ? 'lastOfType' : ''}`}
                         onMouseEnter={this.props.onMouseEnterSectionListCard}
                         onMouseLeave={this.props.onMouseLeaveSectionListCard}
                         style={{
                             ...defaultStyle,
                             ...transitionStyles[state]
                         }}>
                            <ul className={`sectionCardItemContainer ${classes}`}
                                onClick={this.props.onClickSectionListCard}>
                                <li className="sectionCardItem">
                                    {this.props.departmentAndCourseAndSection}
                                </li>
                                <li className="sectionCardItem">
                                    {this.props.timesMet.join(', ')}
                                </li>
                                <li className="sectionCardItem">
                                    {this.props.roomMet.join(', ')}
                                </li>
                                <li className="sectionCardItem">
                                    {this.props.professor.join(' ')}
                                </li>
                                <li className="sectionCardItem"
                                    style={{width: '10%'}}>
                                    {this.props.freeSeats}
                                </li>
                                <li className="sectionCardItem" style={{width: '7%'}}>
                                    <Icon iconName="more" />
                                </li>
                            </ul>
                        </div>
                        {showSingleCourse}
                    </div>
                )}
            </Transition>
        );

        return this.props.isAdvanced ? (<Tooltip2
                className={this.props.isVisible ? "sectionListCardTooltip" : ""}
                content={<span>{unavailableMessage}</span>}
                isOpen={this.props.sectionListHoverSection != undefined &&
                        this.props.sectionListHoverSection.CRN == this.props.CRN &&
                        this.props.isUnavailable}
                openOnTargetFocus={false}
                placement="right">
                {sectionListCard}
            </Tooltip2>) : sectionListCard;
    }
}

// Map Redux state to component props
function mapStateToProps(state) {
    return {
        selectedSections: state.selectedSections,
        sectionListHoverSection: state.sectionListHoverSection,
        isAdvanced: state.isAdvanced
    }
}

// Map Redux actions to component props
function mapDispatchToProps(dispatch, props: SectionListCardProps) {
    return {
        onMouseEnterSectionListCard: () => dispatch(mouseEnterSectionListCard(props)),
        onMouseLeaveSectionListCard: () => dispatch(mouseLeaveSectionListCard()),
        onClickSectionListCard: () => dispatch(clickSectionListCard(props)),
        onClickShowSingleCourse: () => dispatch(clickShowSingleCourse(props))
    }
}