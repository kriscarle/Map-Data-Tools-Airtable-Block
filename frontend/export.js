import React, { useState } from 'react'
import {base, cursor} from '@airtable/blocks'

import download from 'downloadjs'
import tokml from '@maphubs/tokml'
import { QRCode } from 'react-qr-svg'

import {
  useLoadable, useWatchable, useRecordById, useViewMetadata, useRecords,
  Box, Text, Heading, RecordCard, TablePicker, ViewPicker, Link, Button, Switch, Tooltip
} from '@airtable/blocks/ui'

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

function RecordListItem ({table, recordId}) {
  const record = useRecordById(table, recordId)
  const location = record.getCellValue('Location')
  const locationParts = location.split(',')
  let feature
  let lat
  let lon
  if (locationParts.length === 2) {
    lat = parseFloat(locationParts[0])
    lon = parseFloat(locationParts[1])
    feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      }
    }
  }

  return (
    <>
      <RecordCard record={record} />
      {!feature &&
        <Text>Error: Record must have a Location field.</Text>}
      {feature &&
        <div style={{position: 'relative', padding: '10px 5px'}}>
          <div style={{width: '300px'}}>
            <div style={{marginBottom: '5px'}}>
              <Link
                href={`https://www.openstreetmap.org/#map=12/${lat}/${lon}`}
                target='_blank'
                icon='mapPin'
              >
                OpenStreetMap
              </Link>
            </div>
            <div style={{marginBottom: '5px'}}>
              <Link
                href={`https://www.google.com/maps/@${lat},${lon},12z`}
                target='_blank'
                icon='mapPin'
              >
                Google Maps
              </Link>
            </div>
            <div style={{marginBottom: '5px'}}>
              <Button onClick={() => onDownloadKML([feature], record.name)} icon='download'>
                Download KML (Google Earth)
              </Button>
            </div>
            <div style={{marginBottom: '5px'}}>
              <Button onClick={() => onDownloadGeoJSON([feature], record.name)} icon='download'>
                Download GeoJSON
              </Button>
            </div>
          </div>
          <div style={{width: '64px'}}>
            <Tooltip
              content='Scan with your phone to open in Apple Maps or Google Maps'
              placementX={Tooltip.placements.CENTER}
              placementY={Tooltip.placements.BOTTOM}
              shouldHideTooltipOnClick
            >
              <QRCode
                bgColor='#FFFFFF'
                fgColor='#000000'
                level='L'
                style={{ width: 64 }}
                value={`geo:${lat},${lon}`}
              />
            </Tooltip>
          </div>
        </div>}
    </>
  )
}

function getGeoJSONFromRecords (records, fields) {
  return records.map(record => {
    const location = record.getCellValue('Location')
    const locationParts = location.split(',')
    const properties = {name: record.name}

    fields.forEach(field => {
      const name = field.name
      if (name !== 'Cache' && name !== 'Location') { properties[name] = record.getCellValue(name) }
    })
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
}

function SelectedViewItem ({table, view}) {
  const [includeFields, setIncludeFields] = useState(false)
  const records = useRecords(table)
  const viewMetadata = useViewMetadata(view)
  const fields = includeFields ? viewMetadata.visibleFields : []
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

export default function ExportForm () {
  // load selected records and fields
  useLoadable(cursor)
  // re-render whenever the list of selected records or fields changes
  useWatchable(cursor, ['activeTableId', 'selectedRecordIds'])
  const table = base.getTableById(cursor.activeTableId)
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedView, setSelectedView] = useState(null)

  let selectedRecordId
  if (cursor.selectedRecordIds.length === 1) {
    selectedRecordId = cursor.selectedRecordIds[0]
  }
  return (
    <div style={{padding: '10px'}}>
      <Box
        as='section'
        border='default'
        backgroundColor='white'
        padding={1}
        width='100%'
      >
        <Heading size='small'>Select a Record</Heading>
        {!selectedRecordId &&
          <Text>Select a record from a table with a &quot;Location&quot; field</Text>}
        {selectedRecordId &&
          <RecordListItem table={table} recordId={selectedRecordId} />}
      </Box>
      <div style={{width: '100%', textAlign: 'center'}}>
        <Heading size='small'>OR</Heading>
      </div>
      <Box
        as='section'
        border='default'
        backgroundColor='white'
        padding={1}
        width='100%'
      >
        <Heading size='small'>Select a Table</Heading>
        <Text>Select a table with a Location field</Text>
        <TablePicker
          table={selectedTable}
          onChange={newTable => setSelectedTable(newTable)}
          width='100%'
        />
        <ViewPicker
          table={selectedTable}
          view={selectedView}
          onChange={newView => setSelectedView(newView)}
          width='100%'
        />
        {(selectedTable && selectedView) &&
          <SelectedViewItem table={selectedTable} view={selectedView} />}
      </Box>
    </div>
  )
}
