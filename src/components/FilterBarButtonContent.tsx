import { ChevronDownIcon } from '@sanity/icons/ChevronDown'
import { Flex, Text, useTheme_v2 } from '@sanity/ui'
import { isValidElement } from 'react'
import type { ComponentType, ReactNode } from 'react'

type IconProp = ReactNode | ComponentType

export const FILTER_BAR_BUTTON_PADDING = { paddingX: 3, paddingY: 2 } as const

type FilterBarButtonContentProps = {
  text: string
  icon?: IconProp
  media?: ReactNode
  dropdown?: boolean
}

/** Renders an icon given either as an element or as a component, like Sanity schema icons. */
function Icon({ icon }: { icon: IconProp }) {
  if (isValidElement(icon)) {
    return icon
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- schema icons are elements or components, and elements return above
  const IconComponent = icon as ComponentType

  return <IconComponent />
}

/**
 * Content for the filter bar's buttons. The leading icon or avatars sit in a slot as tall as an
 * avatar, so every button in the bar keeps the same height whichever of the two it shows.
 */
export default function FilterBarButtonContent(props: FilterBarButtonContentProps) {
  const { text, icon, media, dropdown = false } = props
  const avatarSize = useTheme_v2().avatar.sizes[0]?.size

  return (
    <Flex align="center" gap={3}>
      <Flex align="center" style={{ height: avatarSize }}>
        {media ||
          (icon && (
            <Text size={1}>
              <Icon icon={icon} />
            </Text>
          ))}
      </Flex>
      <Text size={1} weight="medium">
        {text}
      </Text>
      {dropdown && (
        <Text size={1}>
          <ChevronDownIcon />
        </Text>
      )}
    </Flex>
  )
}
