let React = require('react');
import {connect} from 'react-redux'

import {Button, Dialog, Icon} from '@blueprintjs/core'

import {} from "../actions/sectionActions"


@connect(mapStateToProps, mapDispatchToProps)
export default class SaveDialog extends React.Component {

    constructor() {
        super();

        this.state = {
            isOpen: false
        }
    }

    render() {
        return (<div>
            <Button onClick={this.toggleDialog} iconName="floppy-disk" text="Review/Save" />
            <Dialog
                iconName="floppy-disk"
                isOpen={this.state.isOpen}
                onClose={this.toggleDialog}
                title="Dialog header"
            >
                <div className="pt-dialog-body">
                    Some content
                </div>
                <div className="pt-dialog-footer">
                    <div className="pt-dialog-footer-actions">
                        <Button text="Secondary" />
                    </div>
                </div>
            </Dialog>
        </div>);
    }

    toggleDialog = () => this.setState({ isOpen: !this.state.isOpen });
}

// Map Redux state to component props
function mapStateToProps(state) {
    return {
    }
}

// Map Redux actions to component props
function mapDispatchToProps(dispatch) {
    return {
    }
}