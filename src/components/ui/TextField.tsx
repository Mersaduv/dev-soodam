import { DisplayError } from '@/components/ui'

import { Control, FieldError, useController } from 'react-hook-form'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  errors?: FieldError | undefined
  name: string
  control: Control<any>
  adForm?: boolean
  compacted?: boolean
  isDynamic?: boolean
  isFromTo?: boolean
  isMarketerForm?: boolean
  isDarker?: boolean
}

const TextField: React.FC<Props> = (props) => {
  // ? Props
  const {
    label,
    adForm,
    errors,
    inputMode,
    compacted,
    name,
    isDynamic,
    isFromTo,
    isDarker,
    isMarketerForm,
    type = 'text',
    control,
    ...restProps
  } = props

  // ? Form Hook
  const { field } = useController({ name, control, rules: { required: true } })

  // const direction = name === 'phoneNumber' ? 'rtl' : /^[a-zA-Z0-9]+$/.test(field.value?.[0]) ? 'ltr' : 'rtl'

  // ? Handlers
  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    if (type === 'number' && inputValue.length !== 0) {
      field.onChange(parseInt(inputValue))
    } else {
      field.onChange(inputValue)
    }
  }

  // ? Render(s)
  return (
    <div className={`${isFromTo && 'flex-1'}`}>
      {label && (
        <label
          className={`block ${isDarker && 'text-sm font-normal'} ${label === 'isTo' && 'h-5'} ${isFromTo && '-mr-4'} ${
            adForm ? 'text-sm font-normal mb-2' : 'text-xs mb-3'
          }  text-[#1A1E25] ${isMarketerForm && 'mb-[4px]'} md:min-w-max`}
          htmlFor={name}
        >
          {label !== 'isTo' && label}
        </label>
      )}
      <input
        className={`block ${isDarker && 'bg-[#FCFCFCCC]'} farsi-digits w-full border ${
          adForm
            ? 'h-[40px] placeholder:text-xs font-normal px-2 border-[#E3E3E7] rounded-[8px]'
            : 'h-[48px] px-4 border-[#767372] rounded-[10px]'
        }  outline-none transition-colors placeholder:text-start focus:border-blue-600 text-sm`}
        // style={{ direction }}
        id={name}
        type={type}
        value={field?.value}
        name={isDynamic ? name : field.name}
        onBlur={field.onBlur}
        onChange={onChangeHandler}
        ref={field.ref}
        {...restProps}
      />

      <div dir={'ltr'} className="w-fit">
        <DisplayError adForm errors={errors} />
      </div>
    </div>
  )
}

export default TextField
