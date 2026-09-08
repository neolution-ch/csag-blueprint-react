import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from './form-context'
import TextInputField from './fields/TextInputField'
import PasswordInputField from './fields/PasswordInputField'
import NumberInputField from './fields/NumberInputField'
import SelectField from './fields/SelectField'
import DateInputField from './fields/DateInputField'
import DateTimeInputField from './fields/DateTimeInputField'
import FileInputField from './fields/FileInputField'
import CheckboxField from './fields/CheckboxField'
import MultiSelectField from './fields/MultiSelectField'
import ColorInputField from './fields/ColorInputField'
import SubmitButton from './SubmitButton'
import ServerErrorAlert from './ServerErrorAlert'
import OrphanFieldErrors from './OrphanFieldErrors'

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextInput: TextInputField,
    PasswordInput: PasswordInputField,
    NumberInput: NumberInputField,
    Select: SelectField,
    DateInput: DateInputField,
    DateTimeInput: DateTimeInputField,
    FileInput: FileInputField,
    Checkbox: CheckboxField,
    MultiSelect: MultiSelectField,
    ColorInput: ColorInputField,
  },
  formComponents: {
    SubmitButton,
    ServerErrorAlert,
    OrphanFieldErrors,
  },
})
