import React from 'react';
import focusOnErrorsCreator from 'final-form-focus';
import { withRouter } from 'react-router';
import { Form } from 'react-final-form';
import { FORM_ERROR } from 'final-form';
import { shape, string, func, bool, arrayOf, number } from 'prop-types';
import { isNil, omit, isEmpty } from 'ramda';
import { paths } from 'routes/paths';
import { getBankAccounts, updateBankAccount } from 'api';
import { FieldError } from 'components/Atoms/FieldError/FieldError';
import { Button } from 'components/Atoms/Button/Button';
import { TextLink } from 'components/Atoms/TextLink/TextLink';
import { withRequest } from 'components/Organisms/BankAccountsProvider/BankAccountsProvider';
import { PersonalInformationFormSectionTemplate } from 'components/Templates/PersonalInformationFormSection/PersonalInformationFormSectionTemplate';
import { InvestorTypeSection } from 'components/Templates/PersonalInformationFormSection/InvestorTypeSection';
import {
    fullName,
    address,
    taxInfo,
    manualAddress,
} from 'components/Templates/PersonalInformationFormSection/utils/fields';
import { AddressInputSwitch } from 'components/Molecules/AddressInputSwitch/AddressInputSwitch';
import { InputNoteCustom } from 'components/Molecules/InputNoteCustom/InputNoteCustom';
import { PageSenseScript } from 'analytics/pagesense';
import { PersonalInformationBankSection } from './PersonalInformationBankSection/PersonalInformationBankSection';
import { NewBankAccount } from './PersonalInformationBankSection/NewBankAccount/NewBankAccount';
import { Box } from './Box/Box';
import { Column } from './Column/Column';
import { Row } from './Row/Row';
import { ButtonWrapper } from './ButtonWrapper/ButtonWrapper';
import { ConfirmationCheckbox } from './ConfirmationCheckbox/ConfirmationCheckbox';
import { Description } from './Description/Description';

const focusOnErrorsDecorator = focusOnErrorsCreator();

const checkBoxesTexts = {
    correctData: 'I confirm that this data is correct and up to date.',
    noConflict: `I warrant that this investment, to the best of my knowledge and belief, will not
              create, or appear to create, a conflict of interest with my loyalty to or duties
              for any third party by whom I may be employed or to whom I may provide professional
              services.`,
};

const getBankAccountIdToSelect = bankAccounts => {
    if (bankAccounts.length > 0) {
        const firstAccountId = bankAccounts[0].id;
        return `string${firstAccountId}`;
    }
    return null;
};

export class PersonalInformationFormUnwrapped extends React.Component {
    static propTypes = {
        ibanRequest: shape({
            data: arrayOf(
                shape({
                    id: number,
                    name: string,
                    iban: string,
                }),
            ).isRequired,
            error: string,
            loading: bool.isRequired,
            performRequest: func.isRequired,
        }).isRequired,
        initialValues: shape({}).isRequired,
        isFullnameLocked: bool.isRequired,
        match: shape({
            params: shape({
                slug: string.isRequired,
            }).isRequired,
        }).isRequired,
        onSubmit: func.isRequired,
    };

    state = {
        bankSaveMode: false,
        newIbanError: null,
        currentInitialValues: null,
    };

    fetchIbanAccounts = async () => {
        try {
            const response = await this.props.ibanRequest.performRequest();
            if (isNil(response)) {
                this.handleIbanAdd();
            }
        } catch (error) {
            return {
                [FORM_ERROR]: 'Error occurred',
            };
        }

        return null;
    };

    handleIbanAdd = () => {
        this.setState({
            bankSaveMode: true,
            newIbanError: null,
        });
    };

    handleCancel = values => () => {
        this.handleCurrentInitialValues(values);
        this.setState({
            bankSaveMode: false,
        });
    };

    handleCurrentInitialValues = values => {
        this.setState({
            currentInitialValues: values,
        });
    };

    handleIbanSave = async values => {
        try {
            await updateBankAccount(values);
        } catch (error) {
            return this.setState({
                newIbanError: error.response.data.message,
            });
        }
        await this.fetchIbanAccounts();
        this.handleCancel(values)();
        return null;
    };

    handleModeSwitch = (reset, values, initialValues) => async () => {
        const defaultAddress = {
            address: undefined,
            city: undefined,
            country: undefined,
            postalCode: undefined,
        };
        const currentAddress = initialValues.address.postalCode
            ? initialValues.address
            : {};
        reset({
            ...values,
            address: !isEmpty(currentAddress) ? currentAddress : defaultAddress,
        });
        this.setState(state => ({
            isManualAddressModeOn: !state.isManualAddressModeOn,
        }));
    };

    handleCountryBeforeSubmit = formValues => {
        const mutatedFormValues = { ...formValues };

        mutatedFormValues.address.country = this.state.isManualAddressModeOn
            ? formValues.residencyCountry.name
            : formValues.address.country;

        return mutatedFormValues;
    };

    render() {
        const { bankSaveMode, newIbanError, currentInitialValues } = this.state;
        const {
            initialValues,
            onSubmit,
            isFullnameLocked,
            ibanRequest,
            match,
        } = this.props;
        const filteredInitialValues =
            currentInitialValues && omit(['name', 'iban'], currentInitialValues);

        const bankAccounts = ibanRequest.data || [];
        const selectedAccountId = getBankAccountIdToSelect(bankAccounts);
        const hasTaxInformation = !(
            isNil(initialValues.taxIdNumber) || isNil(initialValues.taxResidence)
        );
        return (
            <React.Fragment>
            <PageSenseScript />
            <Form
        onSubmit={formValues =>
        onSubmit(this.handleCountryBeforeSubmit(formValues))
    }
        decorators={[focusOnErrorsDecorator]}
        initialValues={{
        ...initialValues,
        ...filteredInitialValues,
                bankAccountId: selectedAccountId,
                bankAccounts,
        }}
        render={({
            handleSubmit,
            hasSubmitErrors,
            dirtySinceLastSubmit,
            submitError,
            values,
            errors,
            form: { reset },
            submitting,
        }) => {
            const addressInitials = [initialValues.address];
            const fullnameInitials = [initialValues.fullname];
            const taxInitials = [
                initialValues.taxIdNumber,
                initialValues.taxResidence,
            ];
            const addressErrors = [errors.address];
            const fullNameErrors = [errors.fullname];
            const taxErrors = [errors.taxIdNumber, errors.taxResidence];
            return (
                <form
            id="allocation-request-form"
            onSubmit={event => {
                event.preventDefault();
                if (bankSaveMode && !errors.name && !errors.iban) {
                    this.handleIbanSave({
                        name: values.name,
                        iban: values.iban,
                        ...values,
                    });
                } else {
                    handleSubmit();
                }
                return null;
            }}
        >
        <Box>
            <Column>
            <Row>
            <InvestorTypeSection />
            </Row>
            {values.investorType === 'legalEntity' ? (
                <Row borderBottom="none" px={5} py={5}>
                <Description>
                One of our investment professionals will contact you
                to in order to gather the necessary document for
                investing through a legal entity.
            </Description>
            </Row>
            ) : (
            <React.Fragment>
            <Row>
            <PersonalInformationFormSectionTemplate
                fields={fullName}
                initial={fullnameInitials}
                error={fullNameErrors}
                isLocked={isFullnameLocked}
                />
                </Row>
                <Row>
                {this.state.isManualAddressModeOn ? (
                        <PersonalInformationFormSectionTemplate
                        fields={manualAddress}
                    initial={addressInitials}
                    error={addressErrors}
                    note={
                        initialValues.residencyCountry && (
                            <InputNoteCustom
                        residencyCountryName={
                            initialValues.residencyCountry.name
                        }
                />
            )
            }
                />
            ) : (
            <PersonalInformationFormSectionTemplate
                fields={address}
                initial={addressInitials}
                error={addressErrors}
                note={
                    initialValues.residencyCountry && (
                        <InputNoteCustom
                    residencyCountryName={
                        initialValues.residencyCountry.name
                    }
                />
            )
            }
                />
            )}
                {(errors.address ||
                    this.state.isManualAddressModeOn) && (
                <AddressInputSwitch
                    handleClick={this.handleModeSwitch(
                            reset,
                            values,
                            initialValues,
                        )}
                    isManualModeOn={this.state.isManualAddressModeOn}
                    />
                )}
            </Row>
                {hasTaxInformation && (
                <Row>
                <PersonalInformationFormSectionTemplate
                    fields={taxInfo}
                    initial={taxInitials}
                    error={taxErrors}
                    />
                    </Row>
                )}
            <Row>
            <PersonalInformationBankSection
                bankAccounts={values.bankAccounts}
                bankSaveMode={bankSaveMode}
                bankLoading={ibanRequest.loading}
                onHandleAdd={this.handleIbanAdd}
                />
                {!bankSaveMode &&
                hasSubmitErrors &&
                dirtySinceLastSubmit === false && (
                <Row borderBottom="none">
                    <FieldError justifyContent="center">
                    {submitError}
                    </FieldError>
                    </Row>
                )}
            </Row>
                {bankSaveMode && (
                <Row>
                <NewBankAccount
                    onCancel={this.handleCancel(values)}
                    bankSaveMode={bankSaveMode}
                    newIbanError={newIbanError}
                    />
                    </Row>
                )}
            <ConfirmationCheckbox
                isTicked={values.noConflict}
                checkboxName="noConflict"
                text={checkBoxesTexts.noConflict}
                />
                <ConfirmationCheckbox
                isTicked={values.correctData}
                checkboxName="correctData"
                text={checkBoxesTexts.correctData}
                />
                </React.Fragment>
            )}
        </Column>
            <ButtonWrapper>
            <TextLink
            variant="snow"
            to={paths.getAllocationRequest(match.params.slug)}
                >
                Back
                </TextLink>
                <Button width="20rem" type="submit">
                {submitting ? 'Loading...' : 'Submit'}
                </Button>
                </ButtonWrapper>
                </Box>
                </form>
        );
        }}
        />
        </React.Fragment>
    );
    }
}

export const PersonalInformationForm = withRouter(
    withRequest({
        propName: 'ibanRequest',
        request: getBankAccounts,
    })(PersonalInformationFormUnwrapped),
);
