import React, { useState } from 'react'
import {
  useViewMetadata, useRecords,
  Button, Switch, Tooltip, Text, Box
} from '@airtable/blocks/ui'
import download from 'downloadjs'
import tokml from '@maphubs/tokml'

function onDownloadKML (features, name) {
  const geoJSON = {
    type: 'FeatureCollection',
    features
  }
  const kml = tokml(geoJSON)
  download(`data:text/xml;charset=utf-8,${kml}`, `${name}.kml`, 'text/xml')
}

function onDownloadGeoJSON (features, name) {
  const geoJSON = {
    type: 'FeatureCollection',
    features
  }
  download(`data:application/json;charset=utf-8,${JSON.stringify(geoJSON)}`, `${name}.geojson`, 'application/json')
}

export default function SelectedTableExport ({table, view}) {
  const [includeFields, setIncludeFields] = useState(false)
  const [error, setError] = useState(false)
  const records = useRecords(table)
  const viewMetadata = useViewMetadata(view)
  const fields = viewMetadata.visibleFields || []

  let hasLocation = false
  console.log(fields)
  fields.forEach(field => {
    if (field.name === 'Location' || field.name === 'location') hasLocation = true
  })

  function getGeoJSONFromRecords (records, fields) {
    try {
      return records.map(record => {
        let location = record.getCellValue('Location')
        if (!location) {
          return null
        }
        if (typeof location !== 'string' && Array.isArray(location) && location.length > 0) {
          // handle special case where the Location field is a lookup
          location = location[0]
        }
        const locationParts = location.split(',')
        const properties = {name: record.name}
        if (includeFields) {
          fields.forEach(field => {
            const name = field.name
            if (name !== 'Cache' && name !== 'Location') { properties[name] = record.getCellValue(name) }
          })
        }
        if (locationParts.length === 2) {
          const lat = parseFloat(locationParts[0])
          const lon = parseFloat(locationParts[1])
          return {
            type: 'Feature',
            properties,
            geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            }
          }
        } else {
          return null
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  if (!hasLocation) {
    return (
      <Box
        display='flex'
        alignItems='center'
        justifyContent='center'
        border='thick'
        backgroundColor='white'
        borderRadius='large'
        borderColor='red'
        padding={0}
        height={100}
        overflow='auto'
      >
        <Text>Must countain a field named Location, with latitude,longitude</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        display='flex'
        alignItems='center'
        justifyContent='center'
        border='thick'
        backgroundColor='white'
        borderRadius='large'
        borderColor='red'
        padding={0}
        height={100}
        overflow='auto'
      >
        <Text>Error: {error}</Text>
      </Box>
    )
  }

  return (
    <>
      <div style={{margin: '10px'}}>
        <Tooltip
          content='Including all data may fail for very large tables'
          placementX={Tooltip.placements.CENTER}
          placementY={Tooltip.placements.BOTTOM}
          shouldHideTooltipOnClick
        >
          <Switch
            value={includeFields}
            onChange={newValue => setIncludeFields(newValue)}
            label='Include All Fields'
            width='320px'
          />
        </Tooltip>
      </div>
      <div style={{margin: '10px'}}>
        <Button
          onClick={() => {
            const features = getGeoJSONFromRecords(records, fields)
            onDownloadKML(features, table.name)
          }} icon='download'
        >
          Download KML (Google Earth)
        </Button>
      </div>
      <div style={{margin: '10px'}}>
        <Button
          onClick={() => {
            const features = getGeoJSONFromRecords(records, fields)
            onDownloadGeoJSON(features, table.name)
          }} icon='download'
        >
          Download GeoJSON
        </Button>
      </div>
    </>
  )
}
